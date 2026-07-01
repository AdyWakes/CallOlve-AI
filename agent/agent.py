"""
CallOlve AI — phone agent worker (Phase 2, real-time voice).

A LiveKit Agents worker that answers calls arriving over SIP (Twilio → LiveKit
Cloud) and runs the full voice loop:

    caller audio → Deepgram STT → GitHub Models (LLM + tools) → Deepgram TTS → caller

It seeds its prompt from the CallOlve assistant config, performs real actions
through function tools (book / order / lead / escalate), and on hangup POSTs the
completed call to CallOlve — the SAME /api/v1/voice/complete endpoint the browser
voice demo uses — so the dashboard, analytics, and automation light up identically.

Run:
    cd agent
    python -m venv .venv && .venv\\Scripts\\activate   (Windows)
    pip install -r requirements.txt
    python agent.py dev      # connects out to LiveKit Cloud; no public tunnel needed

Env (read from ../.env automatically, or the agent/.env):
    LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
    DEEPGRAM_API_KEY
    GITHUB_MODELS_TOKEN, GITHUB_MODELS_BASE_URL, GITHUB_MODELS_MODEL
    CALLEASE_API_URL   (default http://localhost:3000)
    AGENT_API_TOKEN    (matches the value in the Next.js .env)
    AGENT_ASSISTANT_ID (optional — otherwise the first active assistant is used)
    DEEPGRAM_TTS_MODEL (default aura-2-thalia-en)
    DEEPGRAM_STT_MODEL (default nova-3)
"""

from __future__ import annotations

import os
import time
import logging
from pathlib import Path

import httpx
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import Agent, AgentSession, JobContext, RunContext, function_tool
from openai.types import realtime

from livekit.plugins import azure, deepgram, elevenlabs, openai, silero

# Load ../.env first (shared with the Next.js app), then agent/.env if present.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

logger = logging.getLogger("callease-agent")
logging.basicConfig(level=logging.INFO)
# Quiet the very chatty plugin DEBUG logs (heavy console I/O during a live call
# can starve the audio thread), but keep the agent lifecycle visible so you can
# see "registered worker", incoming jobs, and call activity.
logging.getLogger("livekit").setLevel(logging.WARNING)
logging.getLogger("livekit.agents").setLevel(logging.INFO)

API_URL = os.environ.get("CALLEASE_API_URL", "http://localhost:3000").rstrip("/")
AGENT_TOKEN = os.environ.get("AGENT_API_TOKEN", "")
ASSISTANT_ID = os.environ.get("AGENT_ASSISTANT_ID") or None


def _headers() -> dict[str, str]:
    return {"x-agent-token": AGENT_TOKEN, "Content-Type": "application/json"}


_NUM_WORDS = {"a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6}


def _parse_items(text: str) -> list[dict]:
    """Parse a spoken order string into [{name, qty}]. Kept flat (no nested
    object tool params) so GitHub Models' strict function schema accepts it."""
    import re

    items: list[dict] = []
    for chunk in re.split(r",|\band\b|\bplus\b", text.lower()):
        chunk = chunk.strip().strip(".")
        if not chunk:
            continue
        m = re.match(r"^(\d{1,2}|a|an|one|two|three|four|five|six)?\s*(?:x|times)?\s*(.+)$", chunk)
        if not m:
            continue
        qty_raw, name = m.group(1), (m.group(2) or "").strip()
        if len(name) < 2:
            continue
        if qty_raw and qty_raw.isdigit():
            qty = int(qty_raw)
        else:
            qty = _NUM_WORDS.get(qty_raw or "", 1)
        items.append({"name": name, "qty": min(qty, 20)})
    return items


def fetch_context() -> dict:
    """Pull the assistant persona + rendered system prompt from CallOlve."""
    params = {"assistantId": ASSISTANT_ID} if ASSISTANT_ID else {}
    r = httpx.get(f"{API_URL}/api/v1/voice/agent-context", params=params, headers=_headers(), timeout=15)
    r.raise_for_status()
    return r.json()["data"]


class CallOlveAgent(Agent):
    """A phone receptionist whose tools record structured work for CallOlve."""

    def __init__(self, instructions: str) -> None:
        super().__init__(instructions=instructions)
        # Accumulated over the call, flushed to CallOlve on hangup.
        self.actions: list[dict] = []
        self.slots: dict = {}
        self.intent: str | None = None
        self.outcome: str | None = None
        self.transcript: list[dict] = []
        self.started_at = time.time()

    def _at(self) -> int:
        return int(time.time() - self.started_at)

    def note(self, speaker: str, text: str) -> None:
        if text:
            self.transcript.append({"speaker": speaker, "text": text, "at": self._at()})

    # ── tools (mirror src/lib/ai/llm.ts so both paths produce the same actions)

    @function_tool
    async def book_appointment(
        self, ctx: RunContext, service: str, name: str, phone: str = "",
        date_text: str = "", time_text: str = "", party_size: int | None = None,
    ) -> str:
        """Book an appointment/reservation after confirming details with the caller.
        Do NOT ask for the phone number — it comes from caller ID."""
        phone = phone or self.caller_phone
        self.slots.update({"name": name, "phone": phone, "service": service,
                           "dateLabel": date_text, "timeLabel": time_text, "partySize": party_size})
        self.actions.append({
            "type": "book_appointment",
            "label": f"Book {service} {date_text} {time_text}".strip(),
            "payload": {"service": service, "dateLabel": date_text, "timeLabel": time_text,
                        "partySize": party_size, "name": name, "phone": phone},
            "status": "executed",
        })
        self.intent = self.intent or "book_appointment"
        self.outcome = "booked"
        return "Appointment recorded. Confirm it to the caller in one short sentence."

    @function_tool
    async def create_order(
        self, ctx: RunContext, items: str, name: str, phone: str = "", order_type: str = "pickup",
    ) -> str:
        """Place an order after the caller confirms. `items` is a plain-text list,
        e.g. 'two margherita pizzas, one garlic bread, a coke'. `order_type` is
        pickup, delivery, or dine_in. Do NOT ask for the phone number."""
        parsed = _parse_items(items)
        phone = phone or self.caller_phone
        self.slots.update({"name": name, "phone": phone, "items": parsed, "orderType": order_type})
        self.actions.append({
            "type": "create_order",
            "label": "Order: " + ", ".join(f"{i['qty']}x {i['name']}" for i in parsed),
            "payload": {"items": parsed, "orderType": order_type, "name": name, "phone": phone},
            "status": "executed",
        })
        self.intent = self.intent or "place_order"
        self.outcome = "order_placed"
        return "Order recorded. Read the items and total back, and confirm in one short sentence."

    @function_tool
    async def capture_lead(
        self, ctx: RunContext, name: str, interest: str, phone: str = "", timeline: str = "",
    ) -> str:
        """Capture a sales lead when a caller is interested in a product/service or pricing.
        Do NOT ask for the phone number — it comes from caller ID."""
        phone = phone or self.caller_phone
        self.slots.update({"name": name, "phone": phone, "interest": interest, "timeline": timeline})
        self.actions.append({
            "type": "capture_lead",
            "label": f"New lead: {name}",
            "payload": {"name": name, "phone": phone, "interest": interest, "timeline": timeline},
            "status": "executed",
        })
        self.intent = self.intent or "lead_inquiry"
        self.outcome = "lead_captured"
        return "Lead captured. Tell the caller a specialist will follow up shortly."

    @function_tool
    async def escalate(self, ctx: RunContext, reason: str, name: str = "", phone: str = "") -> str:
        """Escalate to a human and schedule a callback (support issues, emergencies)."""
        if name:
            self.slots["name"] = name
        if phone:
            self.slots["phone"] = phone
        self.slots["issue"] = reason
        self.actions.append({"type": "escalate", "label": "Escalate to human team",
                             "payload": {"issue": reason, "name": name, "phone": phone}, "status": "executed"})
        self.actions.append({"type": "schedule_callback", "label": f"Callback for {name or 'caller'}",
                             "payload": {"phone": phone, "reason": reason}, "status": "executed"})
        self.intent = self.intent or "support"
        self.outcome = "escalated"
        return "Escalation logged and a callback scheduled. Reassure the caller in one short sentence."

    # ── persistence

    def persist(self) -> None:
        if not self.transcript:
            logger.info("No transcript captured; nothing to persist.")
            return
        body: dict = {
            "assistantId": self.assistant_id,
            "transcript": self.transcript,
            "actions": self.actions,
            "slots": self.slots,
            "intent": self.intent,
            "outcome": self.outcome or "resolved",
            "startedAtMs": int(self.started_at * 1000),
        }
        # Only send caller fields when known (server rejects nulls on these).
        name = self.slots.get("name")
        phone = self.slots.get("phone") or self.caller_phone
        if name:
            body["callerName"] = name
        if phone and phone != "unknown":
            body["callerPhone"] = phone
        try:
            r = httpx.post(f"{API_URL}/api/v1/voice/complete", json=body, headers=_headers(), timeout=20)
            if r.status_code >= 400:
                logger.error("Persist failed %s: %s", r.status_code, r.text[:500])
            else:
                logger.info("Call persisted to CallOlve: %s", r.json().get("data", {}).get("id"))
        except Exception as e:  # noqa: BLE001 — never let persistence kill shutdown
            logger.error("Failed to persist call: %s", e)


def build_llm():
    """LLM from env. If AZURE_OPENAI_KEY is set, use Azure OpenAI (region-local,
    removes the last US hop); otherwise the OpenAI-compatible endpoint
    (Groq / GitHub Models / AMD vLLM) via the GITHUB_MODELS_* vars."""
    if os.environ.get("AZURE_OPENAI_KEY"):
        deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")
        logger.info("Using Azure OpenAI LLM (%s)", deployment)
        return openai.LLM.with_azure(
            model=os.environ.get("AZURE_OPENAI_MODEL", "gpt-4o-mini"),
            azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
            azure_deployment=deployment,
            api_key=os.environ["AZURE_OPENAI_KEY"],
            api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-10-21"),
            temperature=0.4,
            max_completion_tokens=300,
        )
    model = os.environ.get("GITHUB_MODELS_MODEL", "openai/gpt-4o-mini")
    kwargs: dict = dict(
        model=model,
        base_url=os.environ.get("GITHUB_MODELS_BASE_URL", "https://models.github.ai/inference"),
        api_key=os.environ["GITHUB_MODELS_TOKEN"],
        temperature=0.4,
        max_completion_tokens=300,
    )
    if "gpt-oss" in model:
        kwargs["reasoning_effort"] = "low"  # reasoning models: less thinking = faster
    logger.info("Using OpenAI-compatible LLM (%s)", model)
    return openai.LLM(**kwargs)


def build_realtime_model():
    """Use Azure/OpenAI Realtime directly for phone calls.

    This replaces the separate STT -> chat LLM -> TTS loop. The Foundry project
    chat URL remains in GITHUB_MODELS_* for non-phone APIs; realtime calls use
    the Azure target URI plus /openai/v1/realtime.
    """
    model = os.environ.get("REALTIME_MODEL", "gpt-realtime-2")
    key = (
        os.environ.get("REALTIME_API_KEY")
        or os.environ.get("AZURE_OPENAI_API_KEY")
        or os.environ.get("AZURE_OPENAI_KEY")
        or os.environ.get("GITHUB_MODELS_TOKEN")
    )
    if not key:
        raise RuntimeError("REALTIME_API_KEY/AZURE_OPENAI_API_KEY/GITHUB_MODELS_TOKEN is not set")

    base_url = os.environ.get("REALTIME_BASE_URL")
    if not base_url:
        endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", "").rstrip("/")
        if not endpoint:
            raise RuntimeError("REALTIME_BASE_URL or AZURE_OPENAI_ENDPOINT is required for realtime calls")
        base_url = f"{endpoint}/openai/v1/realtime"

    voice = os.environ.get("REALTIME_VOICE", "marin")
    reasoning_effort = os.environ.get("REALTIME_REASONING_EFFORT", "low")
    logger.info("Using Azure Realtime model (%s, voice=%s)", model, voice)
    return openai.realtime.RealtimeModel(
        model=model,
        azure_deployment=model,
        base_url=base_url,
        api_key=key,
        voice=voice,
        modalities=["audio"],
        input_audio_transcription=realtime.AudioTranscription(model="whisper-1"),
        input_audio_noise_reduction="near_field",
        # Azure/OpenAI server VAD was cancelling the opening greeting on phone
        # calls as soon as it saw line noise/DTMF. LiveKit VAD owns turns below.
        turn_detection=None,
        reasoning=realtime.RealtimeReasoning(effort=reasoning_effort),
    )


def build_stt():
    """STT engine from env: 'deepgram' (US) or 'azure' (your Central India Speech
    resource -> removes an ocean hop, lower latency, better Indian-English names)."""
    provider = os.environ.get("STT_PROVIDER", "deepgram").lower()
    if provider == "azure" and os.environ.get("AZURE_SPEECH_KEY"):
        region = os.environ.get("AZURE_SPEECH_REGION", "centralindia")
        logger.info("Using Azure STT (en-IN, %s)", region)
        return azure.STT(
            speech_key=os.environ["AZURE_SPEECH_KEY"],
            speech_region=region,
            language="en-IN",
        )
    logger.info("Using Deepgram STT")
    return deepgram.STT(model=os.environ.get("DEEPGRAM_STT_MODEL", "nova-3"), numerals=True)


def build_tts():
    """Choose the TTS engine from env: 'deepgram' (default) or 'elevenlabs'.
    ElevenLabs `eleven_flash_v2_5` is the lowest-latency realistic voice."""
    provider = os.environ.get("TTS_PROVIDER", "deepgram").lower()
    if provider == "elevenlabs":
        eleven_api_key = os.environ.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVEN_API_KEY")
        if not eleven_api_key:
            logger.warning("TTS_PROVIDER=elevenlabs but ELEVENLABS_API_KEY is missing — using Deepgram.")
        else:
            kwargs = {
                "api_key": eleven_api_key,
                "model": os.environ.get("ELEVENLABS_MODEL", "eleven_flash_v2_5"),
            }
            voice_id = os.environ.get("ELEVENLABS_VOICE_ID")
            if voice_id:
                kwargs["voice_id"] = voice_id
            logger.info("Using ElevenLabs TTS (%s)", kwargs["model"])
            return elevenlabs.TTS(**kwargs)
    if provider == "azure":
        if not os.environ.get("AZURE_SPEECH_KEY"):
            logger.warning("TTS_PROVIDER=azure but AZURE_SPEECH_KEY is missing — using Deepgram.")
        else:
            voice = os.environ.get("AZURE_SPEECH_VOICE", "en-IN-NeerjaNeural")
            logger.info("Using Azure TTS (%s)", voice)
            return azure.TTS(
                voice=voice,
                speech_key=os.environ["AZURE_SPEECH_KEY"],
                speech_region=os.environ.get("AZURE_SPEECH_REGION", "centralindia"),
            )
    logger.info("Using Deepgram TTS")
    return deepgram.TTS(model=os.environ.get("DEEPGRAM_TTS_MODEL", "aura-2-thalia-en"))


def build_session(proc: agents.JobProcess) -> AgentSession:
    mode = os.environ.get("PHONE_AGENT_MODE", "pipeline").lower()
    if mode == "realtime":
        return AgentSession(
            vad=proc.userdata.get("vad") or silero.VAD.load(),
            llm=build_realtime_model(),
            turn_handling={
                "turn_detection": "vad",
                "endpointing": {"min_delay": 0.4, "max_delay": 2.5},
                "interruption": {
                    "enabled": True,
                    "mode": "vad",
                    "min_duration": 0.8,
                    "min_words": 1,
                    "discard_audio_if_uninterruptible": False,
                    "resume_false_interruption": True,
                    "false_interruption_timeout": 2.0,
                },
                "preemptive_generation": {"enabled": False},
            },
            max_tool_steps=3,
            user_away_timeout=None,
        )

    return AgentSession(
        stt=build_stt(),
        llm=build_llm(),
        tts=build_tts(),
        vad=proc.userdata.get("vad") or silero.VAD.load(),
        # Snappier turn-taking, and avoid hitting the free LLM tier twice per
        # turn (preemptive generation can cause rate-limit stalls on free Groq).
        preemptive_generation=False,
        min_endpointing_delay=0.3,
        max_endpointing_delay=2.5,
    )


def prewarm(proc: agents.JobProcess) -> None:
    """Preload the VAD model once per worker process so calls start warm
    (avoids the 'no warmed process available' delay at the start of each call)."""
    proc.userdata["vad"] = silero.VAD.load()


async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()
    context = fetch_context()
    logger.info("Loaded assistant '%s'", context["name"])

    agent = CallOlveAgent(instructions=context["systemPrompt"])
    agent.assistant_id = context["assistantId"]
    agent.caller_phone = "unknown"

    # Best-effort caller number from the SIP participant attributes.
    for p in ctx.room.remote_participants.values():
        num = p.attributes.get("sip.phoneNumber") or p.attributes.get("sip.from")
        if num:
            agent.caller_phone = num
            break

    session = build_session(ctx.proc)

    # Capture turns for the transcript as they're committed.
    @session.on("conversation_item_added")
    def _on_item(ev) -> None:  # noqa: ANN001
        try:
            role = getattr(ev.item, "role", "")
            text = getattr(ev.item, "text_content", None) or ""
            if role == "user":
                agent.note("caller", text)
            elif role == "assistant":
                agent.note("assistant", text)
        except Exception:  # noqa: BLE001
            pass

    # Flush to CallOlve when the call ends. As a fallback, if the live event
    # hook above didn't capture turns (event names vary by LiveKit version),
    # harvest the transcript from the session history before persisting.
    async def _on_shutdown() -> None:
        if not agent.transcript:
            try:
                for item in session.history.items:
                    role = getattr(item, "role", "")
                    text = getattr(item, "text_content", None) or ""
                    if role == "user":
                        agent.note("caller", text)
                    elif role == "assistant":
                        agent.note("assistant", text)
            except Exception:  # noqa: BLE001
                pass
        agent.persist()

    ctx.add_shutdown_callback(_on_shutdown)

    await session.start(agent=agent, room=ctx.room)
    greeting = session.generate_reply(
        instructions=f"Greet the caller with: {context['greeting']}",
        allow_interruptions=False,
    )
    await greeting


if __name__ == "__main__":
    # agent_name must match the SIP dispatch rule created by setup_sip.py.
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            agent_name="callease-phone",
        )
    )

"""
Pre-flight: verify the LiveKit/plugin API symbols this worker uses exist in the
installed package versions — WITHOUT touching your cloud account. Catches the
one version-sensitive risk (SIP API drift) before you run setup_sip.py.

Run:  python preflight.py
"""

from __future__ import annotations

import asyncio
import importlib
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlencode

import aiohttp
import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

ok = True


def check_import(mod: str, names: list[str]) -> None:
    global ok
    try:
        m = importlib.import_module(mod)
    except Exception as e:  # noqa: BLE001
        print(f"  [MISSING] import {mod} failed: {e}")
        ok = False
        return
    for n in names:
        if hasattr(m, n):
            print(f"  [OK]      {mod}.{n}")
        else:
            print(f"  [MISSING] {mod}.{n}  -- API moved in this version")
            ok = False


print("\nlivekit.agents")
check_import(
    "livekit.agents",
    ["Agent", "AgentSession", "JobContext", "RunContext", "function_tool", "WorkerOptions", "cli"],
)

print("\nlivekit.plugins")
for plug in ["azure", "deepgram", "openai", "silero", "elevenlabs"]:
    check_import(f"livekit.plugins.{plug}", [])

if os.environ.get("PHONE_AGENT_MODE", "pipeline").lower() == "realtime":
    print("\nazure/openai realtime config")
    try:
        from livekit.plugins.openai.realtime import RealtimeModel
        from openai.types import realtime

        model = os.environ.get("REALTIME_MODEL", "gpt-realtime-2")
        key = (
            os.environ.get("REALTIME_API_KEY")
            or os.environ.get("AZURE_OPENAI_API_KEY")
            or os.environ.get("AZURE_OPENAI_KEY")
            or os.environ.get("GITHUB_MODELS_TOKEN")
        )
        base_url = os.environ.get("REALTIME_BASE_URL")
        if not base_url:
            endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", "").rstrip("/")
            base_url = f"{endpoint}/openai/v1/realtime" if endpoint else ""
        if not key:
            print("  [MISSING] realtime API key")
            ok = False
        elif not base_url:
            print("  [MISSING] REALTIME_BASE_URL or AZURE_OPENAI_ENDPOINT")
            ok = False
        else:
            RealtimeModel(
                model=model,
                azure_deployment=model,
                base_url=base_url,
                api_key=key,
                voice=os.environ.get("REALTIME_VOICE", "marin"),
                modalities=["audio"],
                input_audio_transcription=realtime.AudioTranscription(model="whisper-1"),
                input_audio_noise_reduction="near_field",
                turn_detection=None,
                reasoning=realtime.RealtimeReasoning(
                    effort=os.environ.get("REALTIME_REASONING_EFFORT", "low")
                ),
            )
            print("  [OK]      Realtime model can be constructed")

            async def _check_ws() -> None:
                url = base_url.replace("https://", "wss://", 1).replace("http://", "ws://", 1)
                if "?" not in url:
                    url = f"{url}?{urlencode({'model': model})}"
                update = {
                    "type": "session.update",
                    "session": {
                        "type": "realtime",
                        "model": model,
                        "output_modalities": ["audio"],
                        "audio": {
                            "input": {
                                "format": {"type": "audio/pcm", "rate": 24000},
                                "noise_reduction": {"type": "near_field"},
                                "transcription": {"model": "whisper-1"},
                                "turn_detection": None,
                            },
                            "output": {
                                "format": {"type": "audio/pcm", "rate": 24000},
                                "voice": os.environ.get("REALTIME_VOICE", "marin"),
                            },
                        },
                        "reasoning": {
                            "effort": os.environ.get("REALTIME_REASONING_EFFORT", "low")
                        },
                    },
                }
                async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=20)) as s:
                    async with s.ws_connect(url, headers={"api-key": key}) as ws:
                        await ws.receive(timeout=8)
                        await ws.send_str(json.dumps(update))
                        for _ in range(5):
                            msg = await ws.receive(timeout=8)
                            if msg.type != aiohttp.WSMsgType.TEXT:
                                continue
                            data = json.loads(msg.data)
                            if data.get("type") == "error":
                                raise RuntimeError(str(data.get("error")))
                            if data.get("type") == "session.updated":
                                return
                        raise RuntimeError("No session.updated event received")

            asyncio.run(_check_ws())
            print("  [OK]      Realtime websocket accepts session config")
    except Exception as e:  # noqa: BLE001
        print(f"  [MISSING] Realtime config failed: {e}")
        ok = False

if os.environ.get("TTS_PROVIDER", "deepgram").lower() == "elevenlabs":
    print("\nelevenlabs TTS config")
    try:
        from livekit.plugins import elevenlabs

        api_key = os.environ.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVEN_API_KEY")
        if not api_key:
            print("  [MISSING] ELEVENLABS_API_KEY or ELEVEN_API_KEY")
            ok = False
        else:
            voice_id = os.environ.get("ELEVENLABS_VOICE_ID", "hpp4J3VqNfWAUOO0d1Us")
            model = os.environ.get("ELEVENLABS_MODEL", "eleven_flash_v2_5")
            elevenlabs.TTS(
                api_key=api_key,
                voice_id=voice_id,
                model=model,
            )
            print("  [OK]      ElevenLabs TTS can be constructed")
            with httpx.stream(
                "POST",
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream",
                headers={"xi-api-key": api_key, "accept": "audio/mpeg"},
                json={"text": "CallOlve voice check.", "model_id": model},
                timeout=20,
            ) as r:
                if r.status_code >= 400:
                    detail = r.read().decode("utf-8", errors="replace")[:300]
                    print(f"  [MISSING] ElevenLabs rejected voice/model ({r.status_code}): {detail}")
                    ok = False
                else:
                    first_chunk = next(r.iter_bytes(), b"")
                    if first_chunk:
                        print("  [OK]      ElevenLabs voice/model returns audio")
                    else:
                        print("  [MISSING] ElevenLabs returned no audio bytes")
                        ok = False
    except Exception as e:  # noqa: BLE001
        print(f"  [MISSING] ElevenLabs TTS config failed: {e}")
        ok = False

print("\nlivekit.api (SIP setup symbols used by setup_sip.py)")
check_import(
    "livekit.api",
    [
        "LiveKitAPI",
        "CreateSIPInboundTrunkRequest",
        "SIPInboundTrunkInfo",
        "CreateSIPDispatchRuleRequest",
        "SIPDispatchRule",
        "SIPDispatchRuleIndividual",
        "RoomConfiguration",
        "RoomAgentDispatch",
    ],
)

print("\n" + ("All API symbols present -- OK" if ok else "Some symbols missing -- tell Claude the output"))
sys.exit(0 if ok else 1)

# CallOlve AI — Live Voice Setup

This is the path from the deterministic demo to a **real, spoken AI phone
conversation**, in two phases. Phase 1 is free and needs only a GitHub Models
token. Phase 2 adds a real dialable phone number using your LiveKit + Twilio +
Azure credits.

---

## Phase 1 — Browser voice (free, $0, live now)

**You speak in the browser → the assistant listens, thinks, replies out loud,
and performs real actions** (booking, ordering, lead capture) through the
existing API. The whole dashboard populates from the call.

### Architecture

```
Browser (Chrome/Edge)
  Web Speech API (STT)  ──speech→text──▶
                                         POST /api/v1/voice/respond
                                           → GitHub Models (LLM + tool-calling)
                                           → tools map to ExtractedAction[]
  Web Speech API (TTS)  ◀──text→speech──   reply
  On hangup:                              POST /api/v1/voice/complete
                                           → completeCall() (same executor as
                                             the simulator) → Call + Appointment
                                             / Order / Lead + analytics
```

The browser handles speech for free; **GitHub Models is the only credential
needed**. The LLM adapter (`src/lib/ai/llm.ts`) speaks the OpenAI
chat-completions protocol, so the exact same code later points at a self-hosted
model on AMD Developer Cloud by changing two env vars.

### Setup (2 minutes)

1. Create a GitHub Models token: **GitHub → Settings → Developer settings →
   Personal access tokens → Fine-grained token**, with the **`models`**
   permission (read). Copy it.
2. Put it in `CallOlve-AI/.env`:
   ```
   GITHUB_MODELS_TOKEN="github_pat_…"
   GITHUB_MODELS_BASE_URL="https://models.github.ai/inference"
   GITHUB_MODELS_MODEL="openai/gpt-4o-mini"
   ```
3. `npm run dev`, open the dashboard, go to **Live AI call** (sidebar), pick an
   assistant, and click **Start call**. Allow the mic when prompted.

> Use **Chrome or Edge** — the Web Speech API isn't in all browsers. If the
> token is missing, the page tells you and the deterministic **Simulator**
> still works with zero setup.

### Model notes

- `openai/gpt-4o-mini` is the default: fast and reliable tool-calling.
- Any tool-calling model on GitHub Models works — change `GITHUB_MODELS_MODEL`.
- Free tier is rate-limited; fine for demos. For unlimited/no-rate-limit, move
  to a self-hosted model (below).

### Move inference to AMD Developer Cloud (still free, no rate limits)

Run an OpenAI-compatible server (vLLM on ROCm) with e.g. Qwen2.5-72B or
Llama-3.3-70B, then point the same env vars at it:

```
GITHUB_MODELS_BASE_URL="http://<your-amd-host>:8000/v1"
GITHUB_MODELS_MODEL="Qwen/Qwen2.5-72B-Instruct"
GITHUB_MODELS_TOKEN="<your-vllm-api-key-or-any-nonempty-string>"
```

No application code changes — the adapter only cares that the endpoint speaks
the OpenAI protocol.

---

## Phase 2 — A real dialable phone number (uses your credits)

Goal: an investor dials a real number and talks to the assistant. The browser
speech is replaced by carrier audio + studio-grade STT/TTS, but **the brain,
tools, and persistence are unchanged**.

### Stack

| Piece | Service | Notes |
|---|---|---|
| Number + PSTN trunk | **Twilio** | buy a number; create a SIP trunk |
| Realtime media | **LiveKit** (+ LiveKit SIP) | bridges the Twilio call into a LiveKit room |
| Agent | **LiveKit Agents** (Python worker) | runs STT → LLM → TTS in the room |
| STT | **Deepgram** | free $200 credit, streaming |
| TTS | **Azure Neural TTS** | free tier 0.5M chars/mo |
| LLM | same GitHub Models / AMD endpoint | reuse `buildSystemPrompt` + tool schema from `src/lib/ai/llm.ts` |

### Steps (when you're ready)

1. **Credentials** → `.env`:
   ```
   LIVEKIT_URL="wss://<project>.livekit.cloud"
   LIVEKIT_API_KEY="…"
   LIVEKIT_API_SECRET="…"
   TWILIO_ACCOUNT_SID="…"
   TWILIO_AUTH_TOKEN="…"
   DEEPGRAM_API_KEY="…"
   AZURE_SPEECH_KEY="…"
   AZURE_SPEECH_REGION="…"
   ```
2. **Twilio**: buy a number → create an Elastic SIP Trunk → point it at the
   LiveKit SIP URI (LiveKit dashboard shows it).
3. **LiveKit SIP**: create an inbound trunk + dispatch rule that routes calls to
   an agent room.
4. **Agent worker** (`agent/` — Python, LiveKit Agents): on a call, build the
   session with Deepgram STT + Azure TTS + the GitHub Models LLM, seed it with
   the assistant's `systemPrompt` (fetched from CallOlve), register the same
   tools, and on hangup `POST /api/v1/voice/complete` with the transcript and
   actions. This worker runs on your **AMD Dev Cloud** box or Azure Container
   Apps (long-lived — not serverless).
5. Dial the number and talk to your assistant.

Because the agent posts the **same completion payload** the browser voice path
already uses, the dashboard, analytics, and automation light up identically —
no further changes.

### Why not skip Phase 1?

Phase 1 gives you a reliable, free, live demo today and validates the LLM
adapter + tool wiring end-to-end. Phase 2 then only swaps the audio transport —
the riskiest, most expensive part is isolated and optional for the pitch.

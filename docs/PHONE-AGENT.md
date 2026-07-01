# CallOlve AI — Real Phone Number (Phase 2 runbook)

Goal: someone dials **+1 972 812 7417** and has a natural, real-time spoken
conversation with your assistant, which books/orders/captures leads and saves
the call to the dashboard.

## How the pieces connect

```
Caller's phone
   │  PSTN
   ▼
Twilio number (+1 972 812 7417)  ──SIP──▶  LiveKit Cloud (hosted SIP)
                                              │  drops the call into a room +
                                              │  dispatches the agent worker
                                              ▼
                              agent/agent.py (runs on YOUR machine, dials OUT)
                                Deepgram STT ─▶ GitHub Models (LLM+tools) ─▶ Deepgram TTS
                                              │ on hangup
                                              ▼
                              POST /api/v1/voice/complete  (x-agent-token)
                                → Call + Appointment/Order/Lead + analytics
```

**No public tunnel is needed:** the worker connects *out* to LiveKit Cloud, and
Twilio reaches LiveKit's *hosted* SIP endpoint. Your Next.js app only needs to be
reachable from the worker — `localhost:3000` is fine since both run on your
machine.

## Prerequisites

- Python 3.9+ (`python --version`).
- The CallOlve app running: `npm run dev` (so the worker can reach the API).
- All keys already in `CallOlve-AI/.env` (done): LiveKit, Twilio, Deepgram,
  GitHub Models, `AGENT_API_TOKEN`, `TWILIO_PHONE_NUMBER`.

## Step 1 — Install the worker

```bash
cd CallOlve-AI/agent
python -m venv .venv
.venv\Scripts\activate          # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
```

## Step 2 — Provision LiveKit SIP (one time)

```bash
python setup_sip.py
```

This creates an **inbound SIP trunk** (accepts calls to your number) and a
**dispatch rule** (new room per call + dispatch the `callease-phone` worker).
Then open the **LiveKit dashboard → Settings → SIP** and copy your project's
**SIP URI** — you need it for Twilio. IMPORTANT: this host is based on your
**Project ID** (e.g. `2mrmrx0svwl.sip.livekit.cloud`), *not* the WS-URL
subdomain. Don't guess it — copy the exact value from Settings → SIP, and set
it as `LIVEKIT_SIP_HOST` in `.env`.

> If `setup_sip.py` errors on a field name, your `livekit-api` version differs;
> do the same two steps with the LiveKit CLI instead — see
> https://docs.livekit.io/sip/ (`lk sip inbound create`, `lk sip dispatch create`).
> The concepts are identical.

## Step 3 — Point Twilio at LiveKit

Your number currently points at Twilio's demo webhooks. Repoint it. **Quick
path (TwiML Bin):**

1. Twilio Console → **Develop → TwiML Bins → Create new**.
2. Paste (replace the host with your LiveKit SIP host from Step 2):
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <Response>
     <Dial answerOnBridge="true">
       <Sip>sip:+19728127417@2mrmrx0svwl.sip.livekit.cloud</Sip>
     </Dial>
   </Response>
   ```
   (replace `2mrmrx0svwl.sip.livekit.cloud` with YOUR exact SIP URI from
   Settings → SIP)
3. Twilio Console → **Phone Numbers → +1 972 812 7417 → Voice → "A call comes
   in"** → set to **TwiML Bin** → select the bin you just made → **Save**.

> Production-grade alternative: Twilio **Elastic SIP Trunking** with the
> Origination URI set to your LiveKit SIP host, and the number attached to the
> trunk. The TwiML Bin is the fastest way to demo.

## Step 4 — Run the worker

```bash
# from CallOlve-AI/agent, with the venv active and `npm run dev` running
python agent.py dev
```

You should see `registered worker` and `Loaded assistant 'Nova'`.

## Step 5 — Call it

Dial **+1 972 812 7417**. Nova answers, you talk, and when you hang up the call
appears in **Calls / Appointments / Analytics** in the dashboard.

## Outbound — the assistant calls a number (easiest to test)

Instead of dialing in, have the assistant ring a phone. This reuses the LiveKit
trunk + dispatch rule already created — **no TwiML Bin needed** (the script
supplies the call instructions). Great when international inbound is costly.

Trial prerequisites (one time):
- **Verify the target number**: Twilio Console → Phone Numbers → Manage →
  Verified Caller IDs → add it → enter the code.
- **Enable the destination country**: Twilio Console → Voice → Settings →
  Geographic Permissions → enable e.g. India → Save.

Then, with the app (`npm run dev`) and worker (`python agent.py dev`) running,
in a third terminal:

```bash
cd CallOlve-AI/agent
.venv\Scripts\activate
python place_call.py +9198XXXXXXXX     # target number, E.164
```

The target phone rings; on answer it's bridged to the agent. On hangup the call
is saved like any other. `place_call.py` derives your LiveKit SIP host from
`LIVEKIT_URL` automatically (override with `LIVEKIT_SIP_HOST` if needed).

## Notes & troubleshooting

- **Twilio trial accounts** play a short "trial" message before connecting and
  can only place *outbound* calls to verified numbers. Inbound demo calls work;
  upgrading removes the preamble.
- **Verify the call saved:** the worker logs `Call persisted to CallOlve: <id>`
  on hangup. If not, check that `npm run dev` is up and `AGENT_API_TOKEN` in the
  worker's env matches the app's `.env`.
- **Voices:** change `DEEPGRAM_TTS_MODEL` (e.g. `aura-2-thalia-en`,
  `aura-2-orion-en`) in the env to re-voice the assistant.
- **LLM on AMD instead of GitHub Models:** point `GITHUB_MODELS_BASE_URL` /
  `GITHUB_MODELS_MODEL` at your vLLM endpoint — the worker picks it up, no code
  change.
- **I could not test a live PSTN call from the build environment.** The brain,
  tools, auth, and persistence are verified; the SIP/Twilio wiring above is the
  part to validate on your first call. If anything sticks, send me the worker
  logs and I'll debug.
```

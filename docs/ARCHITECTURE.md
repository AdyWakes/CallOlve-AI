# CallOlve AI — System Architecture

> The operating system for voice communication. AI assistants that answer, place,
> and act on phone calls for individuals and businesses.

## 1. Architecture at a glance

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
│  Web App (Next.js)   Browser Voice (Web Speech)      Wearables   PSTN   │
└───────────────┬──────────────────┬──────────────────────┬───────────────┘
                │ HTTPS            │ REST / Push          │ SIP/WebRTC
┌───────────────▼──────────────────▼──────────────────────▼───────────────┐
│                        API LAYER  (/api/v1/*)                            │
│   Auth · Assistants · Calls · Simulator · Appointments · Orders ·        │
│   Leads · Analytics · Integrations · Webhooks                            │
├──────────────────────────────────────────────────────────────────────────┤
│                        SERVICE LAYER  (src/lib/services)                  │
│   Pure business logic. No HTTP concerns. Shared by API routes,           │
│   server components, and future workers.                                 │
├────────────────┬───────────────────────────┬─────────────────────────────┤
│ AI ENGINE      │ INTEGRATION ADAPTERS      │ TELEPHONY GATEWAY           │
│ (src/lib/ai)   │ (src/lib/integrations)    │ (agent/ voice worker)       │
│ intent · slots │ CRM · Calendar · Messaging│ LiveKit rooms · Twilio SIP  │
│ actions ·      │ uniform adapter interface │ streaming STT · LLM · TTS   │
│ persona        │ per category              │                             │
├────────────────┴───────────────────────────┴─────────────────────────────┤
│                        DATA LAYER (Prisma)                                │
│        SQLite (dev) / PostgreSQL (prod)        Redis (cache/queues)*      │
└──────────────────────────────────────────────────────────────────────────┘
                                  * Redis is abstracted; in-memory in dev
```

## 2. Design principles

1. **API-first.** Every capability is exposed through versioned REST endpoints
   (`/api/v1/*`). The web UI is just the first client; wearables and
   telephony webhooks consume the same API.
2. **Service layer owns business logic.** API routes are thin: parse → validate
   (Zod) → call service → serialize. Services never import `next/*`, so they can
   be lifted into standalone microservices without rewrites.
3. **Adapter pattern for the outside world.** Telephony, voice synthesis, LLMs,
   CRMs, calendars, and messaging are all behind interfaces. Local dev runs on
   deterministic simulated adapters; production swaps in Twilio, ElevenLabs,
   Claude/GPT, HubSpot, etc. via env config — no call-site changes.
4. **Portable persistence.** Prisma schema runs on SQLite (zero-setup dev) and
   PostgreSQL (production). Enums are validated strings; structured payloads are
   typed JSON serializers (`src/lib/json.ts`).
5. **Microservice-ready seams.** The monolith is sliced along the lines we would
   cut first at scale: `ai-engine`, `telephony-gateway`, `integration-hub`,
   and `analytics`. Each lives in its own folder with its own types.

## 3. Module map

| Module | UI | API | Logic |
|---|---|---|---|
| Authentication | `(auth)/login`, `(auth)/signup` | `/api/auth/*` | `lib/auth/*` |
| Assistants | `(app)/assistants*` | `/api/v1/assistants*` | `services/assistant-service` |
| Call Center | `(app)/dashboard`, `(app)/calls*` | `/api/v1/calls*` | `services/call-service` |
| Conversation Engine | `(app)/simulator` | `/api/v1/simulator/respond` | `lib/ai/engine` |
| Automation Suite | `(app)/appointments`, `orders`, `leads` | `/api/v1/{appointments,orders,leads}` | `services/*` |
| Analytics | `(app)/analytics` | `/api/v1/analytics/overview` | `services/analytics-service` |
| Integrations | `(app)/integrations` | `/api/v1/integrations*` | `lib/integrations/*` |
| Settings/Team | `(app)/settings` | `/api/v1/settings/*` | `services/user-service` |

## 4. The AI conversation engine

The engine (`src/lib/ai/engine.ts`) is a deterministic, pluggable pipeline:

```
caller utterance
   → normalize
   → intent detection      (keyword/pattern scoring; LLM adapter in prod)
   → slot extraction       (dates, times, party size, names, phones, items)
   → dialog state machine  (per-scenario: booking, ordering, support, lead)
   → persona renderer      (assistant personality/tone shapes the reply)
   → action extractor      (structured ExtractedAction[] for task execution)
```

Why deterministic first? It makes the whole platform demoable and testable with
zero API keys, and it defines the **contract** a real LLM adapter must satisfy:
`respond(state, utterance) → { reply, state, actions[] }`. Production swaps the
intent/reply stages for an LLM (Claude) + STT/TTS while keeping the same state
and action schema. Voice transport (Twilio Media Streams / Vapi / Retell) plugs
in at the telephony gateway seam, not inside the engine.

### Action execution

`ExtractedAction` is the unit of AI task execution:

```ts
{ type: "book_appointment" | "create_order" | "capture_lead" | "schedule_callback"
       | "send_message" | "create_reminder" | "update_crm" | "escalate",
  payload: Record<string, unknown>, status: "proposed" | "executed" | "failed" }
```

The action executor (`lib/ai/executor.ts`) maps actions to service calls
(create appointment, create order, …) and, in production, to integration
adapters (update HubSpot, send WhatsApp confirmation). Every execution is
audit-logged.

## 5. Telephony architecture (production path)

```
PSTN/SIP ↔ Twilio (numbers, media streams)
              ↕ WebSocket audio
        Telephony Gateway service
              ↕ STT (Deepgram/Whisper) · TTS (ElevenLabs)
        AI Engine (LLM adapter, same contract as simulator)
              ↕ actions
        Action Executor → services + integration adapters
```

Inbound: Twilio webhook → gateway answers with assistant config → streamed
conversation → on hangup, the gateway posts a completed `Call` (transcript,
summary, actions) to `/api/v1/calls` — the **same payload shape the simulator
produces today**, which is why the rest of the platform is already wired for it.

Outbound & scheduled calls: a queue worker (Redis/BullMQ) picks up `Call` rows
with `status=scheduled`, dials via Twilio, runs the same loop.

## 6. Security model

- Passwords: bcrypt (cost 10). Sessions: signed JWT (jose, HS256) in an
  `HttpOnly`, `SameSite=Lax`, `Secure` (prod) cookie, 7-day expiry.
- Route protection at the edge (`src/middleware.ts`) + per-request session
  verification in API routes. All queries are scoped by `userId` — no
  cross-tenant reads by construction.
- Input validation with Zod at every API boundary.
- Integration credentials: stored encrypted at rest in production (KMS);
  the dev build stores only mock config.
- Audit log model for sensitive actions (enterprise requirement).
- Future: org-level RBAC (owner/admin/member roles are already on the model),
  API keys with hashed storage, rate limiting via Redis.

## 7. Scaling path

| Stage | Move |
|---|---|
| MVP (now) | Single Next.js deployment + SQLite/Postgres |
| Growth | Postgres + Redis cache; queue workers for outbound calls & follow-ups |
| Scale | Extract telephony gateway (stateful WebSockets) and AI engine into services; event bus (NATS/Kafka) between gateway → engine → executor |
| Enterprise | Per-org data partitioning, SSO (SAML/OIDC), VPC peering, regional deployments |

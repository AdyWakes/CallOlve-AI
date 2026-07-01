# CallOlve AI — API Reference (v1)

Base URL: `/api`. All `/api/v1/*` endpoints require an authenticated session
cookie (`callease_session`). Responses are JSON: `{ data }` on success,
`{ error: { message, details? } }` on failure with appropriate HTTP status
(400 validation, 401 unauthenticated, 404 not found, 500 server).

All request bodies are validated with Zod; allowed enum values live in
[`src/lib/types.ts`](../src/lib/types.ts).

## Auth

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/signup` | `{ name, email, password, company? }` | Creates user (+org if company), sets session cookie |
| POST | `/api/auth/login` | `{ email, password }` | Sets session cookie |
| POST | `/api/auth/logout` | — | Clears cookie |
| GET | `/api/auth/me` | — | Current user profile |

## Assistants

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/assistants` | List assistants for current user |
| POST | `/api/v1/assistants` | Create. Body: name, role, personality, tone, voice, language, greeting, systemPrompt, memoryEnabled |
| GET | `/api/v1/assistants/:id` | Detail incl. recent calls |
| PATCH | `/api/v1/assistants/:id` | Partial update (incl. `status` active/paused) |
| DELETE | `/api/v1/assistants/:id` | Delete (calls keep history via `SetNull`) |

## Calls

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/calls` | Filters: `status`, `direction`, `intent`, `assistantId`, `q` (caller search), `take`, `skip` |
| POST | `/api/v1/calls` | Record a completed/scheduled call (used by simulator & future telephony gateway) |
| GET | `/api/v1/calls/:id` | Full detail: transcript, actions, linked records |
| PATCH | `/api/v1/calls/:id` | Update status/notes (e.g. mark scheduled call) |
| DELETE | `/api/v1/calls/:id` | Remove a log entry |

## Conversation simulator

| Method | Path | Notes |
|---|---|---|
| POST | `/api/v1/simulator/respond` | Body: `{ assistantId, state, utterance }` → `{ reply, state, actions, done }`. Stateless engine turn — the same contract a production LLM adapter implements. |
| POST | `/api/v1/simulator/complete` | Body: `{ assistantId, state, callerName?, callerPhone? }` → persists a `Call` with transcript/summary/actions and executes extracted actions (creates Appointment/Order/Lead). |

## Automation

| Method | Path | Notes |
|---|---|---|
| GET/POST | `/api/v1/appointments` | List (filter `status`, `from`, `to`) / create |
| PATCH/DELETE | `/api/v1/appointments/:id` | Status lifecycle, edit, cancel |
| GET/POST | `/api/v1/orders` | List (filter `status`) / create |
| PATCH/DELETE | `/api/v1/orders/:id` | Move through `new → preparing → ready → fulfilled` |
| GET/POST | `/api/v1/leads` | List (filter `status`) / create |
| PATCH/DELETE | `/api/v1/leads/:id` | Pipeline status, score, notes |

## Analytics

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/analytics/overview?days=30` | KPIs + series: volume by day, intents, outcomes, sentiment, satisfaction trend, conversion funnel, busiest hours |

## Integrations

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/integrations` | Registry of all providers + connection status |
| POST | `/api/v1/integrations` | `{ provider }` → connect (mock OAuth in dev) |
| DELETE | `/api/v1/integrations/:provider` | Disconnect |

## SOS

| Method | Path | Notes |
|---|---|---|
| GET/POST | `/api/v1/sos/contacts` | Emergency contact list / add |
| PATCH/DELETE | `/api/v1/sos/contacts/:id` | Edit priority/channels, remove |
| GET | `/api/v1/sos/events` | Safety history |
| POST | `/api/v1/sos/events` | Trigger SOS: `{ triggerType, lat?, lng?, address? }` → runs dispatch pipeline, returns event with timeline |
| GET | `/api/v1/sos/events/:id` | Event detail + timeline |
| PATCH | `/api/v1/sos/events/:id` | Resolve / cancel / mark false alarm |

## Settings

| Method | Path | Notes |
|---|---|---|
| PATCH | `/api/v1/settings/profile` | Update name, phone, timezone, language |

## Webhooks (inbound, stubs)

| Path | Purpose |
|---|---|
| POST `/api/webhooks/telephony` | Twilio/Vapi call events → will create/append Call records |
| POST `/api/webhooks/messaging` | WhatsApp/Telegram/SMS inbound messages |

## Versioning & future surface

`/api/v1` is additive-only; breaking changes ship under `/api/v2`. Planned:
API keys (`Authorization: Bearer ck_…`) for server-to-server use, webhook
subscriptions (outbound), batch endpoints, and a WebSocket channel for live
call monitoring (`/api/v1/live`).

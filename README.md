# CallOlve AI

**The operating system for voice communication.** AI assistants that answer
your phone, book appointments, take orders, qualify leads, resolve support
issues — and keep you safe with a built-in SOS emergency pipeline.

Built with Next.js 15, TypeScript, Tailwind CSS v4, Prisma, and a
deterministic AI conversation engine that runs end-to-end with **zero API
keys** — every screen works on real data out of the box.

---

## Quickstart

```bash
cd CallOlve-AI
npm install        # also runs prisma generate
npm run db:push    # create the SQLite dev database
npm run db:seed    # demo workspace + a month of realistic data
npm run dev        # http://localhost:3000
```

**Demo login:** `demo@callease.ai` / `demo1234`

Then try the flagship flow: **Dashboard → Simulator → Start call** and type
*"Hi, I'd like to book a table for 4 tomorrow at 7pm"*. Finish the
conversation and watch the call, appointment, contact, and analytics all
update.

## What's inside

| Module | What it does |
|---|---|
| **Landing page** | Marketing site: hero, live-call visual, demo, features, use cases, pricing, testimonials, FAQ, contact |
| **Auth** | Credential signup/login, bcrypt + JWT cookie sessions, edge middleware protection |
| **Assistants** | Multiple AI personas: role, personality, tone, voice, language, greeting, prompt, long-term memory |
| **Conversation engine** | Deterministic dialog engine: intent detection → slot extraction → confirmation → action extraction (`src/lib/ai`) |
| **Live AI voice** | Speak to your assistant out loud in the browser — GitHub Models brain + real tool-calling, free. Upgrades to a real phone number via LiveKit + Twilio. See [docs/VOICE-SETUP.md](docs/VOICE-SETUP.md) |
| **Simulator** | Talk to your assistant like a caller (text); completed calls persist with transcript, summary, sentiment, and executed actions |
| **Call log** | Filterable history with full transcripts, AI summaries, and linked records |
| **Automation** | Appointments (lifecycle), Orders (kitchen flow), Leads (scored pipeline) — all fed by the engine |
| **Analytics** | Volume, intents, outcomes, sentiment, CSAT, revenue, busiest hours — computed live, custom SVG charts |
| **Integrations** | CRM / calendar / messaging hub with uniform adapter contracts and mock providers |
| **SOS Emergency** | Trigger → locate → alert contacts → AI calls → evidence capture, with live timeline and safety history |
| **Enterprise-lite** | Organizations, roles, team list, audit log |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | Strict TypeScript check |
| `npm run db:push` | Sync Prisma schema to the database |
| `npm run db:seed` | Seed demo data (idempotent — wipes and recreates) |
| `npm run db:reset` | Force-reset DB + reseed |
| `npx tsx scripts/engine-smoke.ts` | Conversation-engine regression test (5 flows) |
| `npx prisma studio` | Browse the database |

## Project structure

```
CallOlve-AI/
├─ docs/                    Architecture, database, API, flows, milestones,
│                           roadmap, SOS design, deployment
├─ prisma/                  schema.prisma + seed.ts
├─ scripts/                 engine-smoke.ts (dialog regression tests)
└─ src/
   ├─ app/
   │  ├─ (marketing)/       Landing page
   │  ├─ (auth)/            Login / signup
   │  ├─ (app)/             Dashboard, assistants, calls, simulator,
   │  │                     appointments, orders, leads, analytics,
   │  │                     integrations, sos, settings
   │  └─ api/               /api/auth/* and versioned /api/v1/* + webhooks
   ├─ components/           ui primitives · landing · shell · feature modules
   ├─ lib/
   │  ├─ ai/                engine, intents, slots, persona, executor, presets
   │  ├─ auth/              sessions (jose), passwords (bcrypt), current user
   │  ├─ integrations/      adapter contracts, registry, mock providers
   │  ├─ sos/               dispatch pipeline
   │  ├─ services/          business logic (no HTTP) — one per module
   │  └─ types.ts           domain vocabulary: enums + Zod schemas
   └─ middleware.ts          edge route protection
```

## Architecture in one paragraph

API-first (`/api/v1/*`, versioned, Zod-validated) over a service layer that
never imports HTTP concerns, over Prisma (SQLite dev / PostgreSQL prod). The
AI engine is a deterministic state machine that defines the exact contract —
`respond(state, utterance) → { reply, state, actions }` — a production
LLM + STT/TTS stack plugs into, and the action executor turns engine output
into real records and (in production) integration-adapter calls. Telephony,
CRMs, calendars, and messaging all sit behind swappable adapters. Details:
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md) · [Database](docs/DATABASE.md) ·
  [API reference](docs/API.md) · [User flows](docs/USER-FLOWS.md)
- [Milestones](docs/MILESTONES.md) (how this was built, with test plans)
- [SOS emergency design](docs/SOS.md) — including the Flutter mobile client contract
- [Live voice setup](docs/VOICE-SETUP.md) — Phase 1 (free browser voice) → Phase 2 (real phone number)
- [Phone agent runbook](docs/PHONE-AGENT.md) — wire the Twilio number to the LiveKit + Deepgram worker
- [Deployment](docs/DEPLOYMENT.md) · [Roadmap](docs/ROADMAP.md)

## Going live (the short version)

1. PostgreSQL: flip the Prisma provider, set `DATABASE_URL`, run migrations.
2. Set a strong `AUTH_SECRET`.
3. Add provider keys (Twilio, ElevenLabs, LLM) to activate live voice — the
   telephony gateway posts the same Call payloads the simulator produces.
4. Deploy to Vercel (or any Node host). Full guide:
   [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

*CallOlve AI — preview build. The conversation engine, integrations, and SOS
dispatch run in simulation mode until provider credentials are configured.*

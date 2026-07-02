# CallOlve AI — Development Milestones

Each milestone is independently testable and leaves the app in a stable state.

---

## Milestone 1 — Project setup & architecture

**Goal:** A running Next.js 15 + TypeScript + Tailwind v4 + Prisma foundation
with the complete data model and architecture documented before feature code.

**Features:** Project scaffold, strict TS config, Tailwind v4 design tokens,
Prisma schema (all 12 modules' tables), SQLite dev DB, env handling, docs
(architecture, database, API, user flows, milestones, roadmap).

**Files/folders:** `package.json`, `tsconfig.json`, `next.config.ts`,
`postcss.config.mjs`, `prisma/schema.prisma`, `docs/*`, `src/app/{layout,globals.css}`,
`src/lib/{db,types,json,utils}.ts`.

**Expected output:** `npm install && npm run db:push` succeeds; `npm run dev`
serves a styled placeholder; `npx tsc --noEmit` passes.

**How to test:** Run the three commands above; open Prisma Studio
(`npx prisma studio`) and confirm all tables exist.

**Risks:** Tailwind v4 + Next 15 PostCSS wiring (use `@tailwindcss/postcss`);
SQLite lacks enums/JSON (mitigated: validated strings + typed serializers);
OneDrive file-watcher slowness on Windows (cosmetic; dev server still works).

---

## Milestone 2 — Landing page & core UI system

**Goal:** Premium, futuristic public site that sells the product, plus the
reusable component library every later screen uses.

**Features:** Design tokens (dark theme, cyan→violet gradient accents, glass
surfaces, glow effects); primitives (Button, Card, Badge, Input, Select,
Textarea, Avatar, Stat, EmptyState, Logo); landing sections: navbar, hero with
animated call visual, live demo transcript, features grid, use cases
(restaurants/clinics/real-estate/hotels/support/sales/entrepreneurs/personal),
pricing (3 tiers + enterprise), testimonials, FAQ, contact/CTA, footer.

**Files/folders:** `src/components/ui/*`, `src/components/landing/*`,
`src/app/(marketing)/page.tsx`, `src/app/globals.css`.

**Expected output:** `/` renders a polished responsive landing page; all
primitives documented by usage.

**How to test:** Visual pass at 375px/768px/1440px widths; keyboard-tab through
nav and CTAs; Lighthouse a11y sanity (labels, contrast, alt text).

**Risks:** Heavy visuals hurting performance (mitigate: CSS-only animation, no
animation libraries); gradient contrast failing a11y (check text contrast).

---

## Milestone 3 — Authentication & user dashboard

**Goal:** Real credential auth with secure sessions and the app shell
(sidebar/topbar) that hosts every module.

**Features:** Signup, login, logout; bcrypt password hashing; jose-signed JWT
in HttpOnly cookie; edge middleware protecting `(app)` routes; `/api/auth/*`;
dashboard home (KPIs, recent calls, quick actions, onboarding empty states);
settings page (profile, password, plan, team list); seeded demo account.

**Files/folders:** `src/lib/auth/*`, `src/middleware.ts`, `src/app/api/auth/*`,
`src/app/(auth)/{login,signup}`, `src/app/(app)/layout.tsx`,
`src/app/(app)/dashboard`, `src/app/(app)/settings`, `src/components/shell/*`.

**Expected output:** Full auth round-trip; visiting `/dashboard` logged-out
redirects to `/login?next=…`; demo login `demo@callolve.ai / demo1234`.

**How to test:** Signup → land on dashboard → logout → login; tamper the cookie
and confirm 401/redirect; duplicate-email signup returns a clean field error.

**Risks:** Edge middleware can't use Node crypto (jose is edge-safe — verify
only, sign in Node routes); cookie flags wrong in dev vs prod (Secure only in
prod); password rules too strict for demo (min 8 chars).

---

## Milestone 4 — AI assistant management

**Goal:** Create and manage multiple configured AI personas.

**Features:** Assistant list with status; 3-step creation wizard (identity →
personality/voice → behavior) with role-based prompt templates; detail page
with editable config, memory notes, status toggle (active/paused), delete;
voice preset gallery; REST CRUD.

**Files/folders:** `src/app/(app)/assistants/*`, `src/app/api/v1/assistants/*`,
`src/lib/services/assistant-service.ts`, `src/lib/ai/presets.ts`,
`src/components/assistants/*`.

**Expected output:** Create → edit → pause → delete round-trip from the UI;
seeded account ships with 3 assistants.

**How to test:** Wizard happy path; API validation (empty name → 400); pause an
assistant and confirm badge changes; delete keeps historical calls (assistant
shows as "Deleted assistant").

**Risks:** Prompt templates drifting from engine expectations (templates live
beside engine in `lib/ai`); wizard state loss on refresh (acceptable for MVP).

---

## Milestone 5 — Call logs & conversation simulation

**Goal:** The heart of the demo: a deterministic AI conversation engine you can
talk to, producing real Call records with transcripts, summaries, and actions.

**Features:** Engine (intent detection, slot extraction, per-intent dialog
state machines, persona-shaped replies, action extraction); simulator page
(pick assistant, live chat-as-phone-call UI, end call → persists); calls list
(filters: status/direction/intent/search; direction & outcome badges); call
detail (transcript timeline, summary, sentiment, satisfaction, extracted
actions, linked records); seed script with ~60 realistic calls across 30 days.

**Files/folders:** `src/lib/ai/{engine,intents,slots,persona,executor}.ts`,
`src/app/(app)/{simulator,calls}/*`, `src/app/api/v1/{calls,simulator}/*`,
`src/lib/services/call-service.ts`, `prisma/seed.ts`.

**Expected output:** A full simulated booking call creates a Call + Appointment
+ Contact visible across the app.

**How to test:** Script: "Hi, I'd like to book a table for 4 tomorrow at 7pm"
→ engine asks for name → confirms → end call → check Calls log, Appointments,
and Contacts. Repeat for order, lead, and support scripts.

**Risks:** Date parsing ("tomorrow", "7pm") edge cases (keep parser small,
deterministic, tested via scripts); engine state serialization bugs (state is
plain JSON, validated with Zod).

---

## Milestone 6 — Business automation modules

**Goal:** Operational pages where the AI's work lands.

**Features:** Appointments (upcoming/past, status transitions, day grouping);
Orders (status board new→preparing→ready→fulfilled, items breakdown, totals);
Leads (pipeline list, score bars, status transitions, notes); manual create
forms; REST CRUD for all three.

**Files/folders:** `src/app/(app)/{appointments,orders,leads}/*`,
`src/app/api/v1/{appointments,orders,leads}/*`, `src/lib/services/*`.

**Expected output:** Records created by simulator calls are manageable
end-to-end; counts match dashboard KPIs.

**How to test:** Advance an order through all statuses; cancel an appointment;
convert a lead; create each manually; confirm a simulator booking appears.

**Risks:** Status transition rules inconsistent between UI and API (single
source: transition maps in `types.ts`); timezone display drift (store UTC,
render local).

---

## Milestone 7 — Analytics dashboard

**Goal:** Decision-grade insight computed from real data — no hardcoded charts.

**Features:** KPI row (total calls, avg duration, resolution rate, booking
conversion, est. revenue, CSAT); call volume area chart (30d); intent donut;
outcome bars; sentiment split; satisfaction trend; busiest-hours heat strip;
period selector (7/30/90d). Custom dependency-free SVG chart components.

**Files/folders:** `src/app/(app)/analytics/*`,
`src/app/api/v1/analytics/overview/route.ts`,
`src/lib/services/analytics-service.ts`, `src/components/charts/*`.

**Expected output:** Charts reflect seeded + simulator-generated data and
update after each new simulated call.

**How to test:** Run a simulator call → refresh analytics → volume/intents
shift; switch periods; empty-state for a fresh account renders gracefully.

**Risks:** Aggregation correctness (unit-style assertions in service);
division-by-zero on empty data (guarded helpers); chart rendering with 1 data
point (min-width handling).

---

## Milestone 8 — Integrations architecture

**Goal:** The integration hub: uniform adapter interfaces with mock providers,
real connect/disconnect state, production-ready seams.

**Features:** Provider registry (HubSpot, Salesforce, Zoho, Custom API; Google/
Outlook/Apple Calendar; WhatsApp, Instagram, Telegram, SMS, Email); category-
grouped integrations page with connect (mock OAuth) / disconnect; adapter
interfaces (`CrmAdapter`, `CalendarAdapter`, `MessagingAdapter`) + mock
implementations; webhook stubs for telephony/messaging.

**Files/folders:** `src/lib/integrations/{registry,types,adapters/*}.ts`,
`src/app/(app)/integrations/*`, `src/app/api/v1/integrations/*`,
`src/app/api/webhooks/*`.

**Expected output:** Connect/disconnect persists; connected count shows on
dashboard; adapters callable from the action executor.

**How to test:** Connect HubSpot + Google Calendar → reload → still connected;
disconnect; hit webhook stub with curl → 200 + logged payload shape.

**Risks:** Over-building OAuth for providers we can't test (keep mock boundary
explicit); config secrets in plaintext (documented: encrypt in prod, mock-only
data in dev).

---

## Milestone 9 — Database, API & documentation cleanup

**Goal:** Ship-ready repo: docs complete, API stable, production build green.

**Features:** README (overview, quickstart, scripts, structure, demo creds);
DEPLOYMENT.md (Vercel + Postgres + Redis, env matrix, migration steps);
finalized API.md; ROADMAP.md; code sweep (dead code, consistent errors, loading
states); full `tsc --noEmit` + `next build` + manual route pass.

**Files/folders:** `README.md`, `docs/*`, touch-ups across `src/`.

**Expected output:** `npm install && npm run db:push && npm run db:seed &&
npm run build && npm start` works from a clean clone.

**How to test:** Clean-clone dry run of the quickstart; click through every
route logged-in and logged-out; verify all docs' commands copy-paste correctly.

**Risks:** Build-only failures (dynamic APIs, `headers()` usage) surfacing late
— mitigated by running `next build` at every milestone boundary, not just here.

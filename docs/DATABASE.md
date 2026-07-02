# CallOlve AI — Database Design

Source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma).
Dev runs SQLite; production runs PostgreSQL (same schema — see notes below).

## Entity-relationship overview

```
Organization 1──* User
User 1──* Assistant 1──* Call
User 1──* Call ──1? Appointment / Order / Lead   (one business object per call)
User 1──* Contact
User 1──* Integration            (unique per provider)
User 1──* AuditLog
```

## Tables

### Identity
- **Organization** — tenant container for enterprise plans (`plan`, `industry`).
- **User** — account + profile. `role` (owner/admin/member) powers team RBAC.
  Auth is credential-based (bcrypt hash); social login adds a `provider` +
  `providerAccountId` columns later (documented in ROADMAP).

### AI
- **Assistant** — a configured AI persona: `role`, `personality`, `tone`,
  `voice`, `language`, `greeting`, `systemPrompt`, `memoryEnabled`,
  `memoryNotes` (JSON string[]), `status`, optional `phoneNumber`.

### Calls
- **Call** — the core event record. `direction`, `status`, caller identity,
  timing, and AI outputs: `intent`, `outcome`, `sentiment`, `satisfaction`,
  `summary`, `transcript` (JSON `TranscriptTurn[]`), `actions`
  (JSON `ExtractedAction[]`). `scheduledFor` powers scheduled/outbound calls.
- **Contact** — caller book, unique per `(userId, phone)`, auto-upserted when
  calls complete.

### Automation
- **Appointment** — service, `startsAt`, `durationMin`, status lifecycle
  `pending → confirmed → completed | cancelled | no_show`. Optionally linked
  1:1 to the call that created it.
- **Order** — `items` (JSON `OrderItem[]`), `totalCents` (integer money —
  never floats), `type` (delivery/pickup/dine_in), status lifecycle
  `new → preparing → ready → fulfilled | cancelled`.
- **Lead** — `score` 0–100, status pipeline `new → qualified → contacted →
  converted | lost`, `source`, `interest`.

### Platform
- **Integration** — one row per `(userId, provider)`; `category` crm/calendar/
  messaging; `config` JSON (encrypted in prod); `status` connected/disconnected/error.
- **AuditLog** — `action`, `target`, `meta` for enterprise compliance.

## Conventions

- **IDs**: `cuid()` strings everywhere (safe to expose in URLs).
- **Enum-as-string**: SQLite has no native enums, so allowed values are
  enforced by Zod schemas in `src/lib/types.ts` (single source of truth used by
  API validation, services, and UI option lists alike).
- **JSON-as-string**: typed (de)serializers in `src/lib/json.ts` guard every
  read/write. On PostgreSQL these columns can be migrated to `jsonb` with a
  one-line schema change per column.
- **Money**: integer cents (`totalCents`) + ISO currency code.
- **Multi-tenancy**: every business table carries `userId` and every query is
  scoped through the service layer. Org-level sharing is added by widening the
  scope predicate in one place (services), not by touching call sites.

## Switching dev → PostgreSQL

1. In `prisma/schema.prisma`, set `provider = "postgresql"`.
2. Set `DATABASE_URL=postgresql://user:pass@host:5432/callolve`.
3. `npx prisma migrate dev --name init` (use migrations, not `db push`, from
   this point on).
4. Optional hardening: convert JSON string columns to `Json` type and string
   enums to native enums — both are mechanical, validated by the same Zod layer.

## Indexing strategy

Hot paths covered: `Call(userId, startedAt)` for log lists & analytics ranges,
`Appointment(userId, startsAt)` for calendar views, `Order/Lead(userId,
createdAt)` for pipelines, and unique `(userId, provider)` and
`(userId, phone)` to prevent duplicates.

# CallOlve AI — Deployment Guide

## 1. Environment matrix

| Variable | Dev | Production |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` (SQLite) | `postgresql://…` (required) |
| `AUTH_SECRET` | any string | **32+ random bytes, secret** (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `REDIS_URL` | unset (in-memory fallbacks) | Redis/Upstash — queues, rate limits |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | unset (simulation) | enables live telephony + SMS |
| `ELEVENLABS_API_KEY` | unset | enables TTS voices |
| `OPENAI_API_KEY` (or Anthropic) | unset | enables the LLM engine adapter |

No provider key is required for the platform itself — missing keys keep the
corresponding subsystem in simulation mode.

## 2. PostgreSQL migration

1. `prisma/schema.prisma` → `provider = "postgresql"`.
2. Set `DATABASE_URL`.
3. First deploy: `npx prisma migrate dev --name init` locally against a dev
   Postgres, commit the `prisma/migrations/` folder, then run
   `npx prisma migrate deploy` in CI/production. (Use migrations from this
   point on, not `db push`.)
4. Optional hardening (mechanical, the Zod layer stays the validator):
   - JSON string columns (`transcript`, `actions`, `timeline`, `items`,
     `config`, `memoryNotes`, `tags`, `notifiedContacts`) → `Json` type.
   - String enums → native Postgres enums.
5. Seed production only if you want the demo workspace: `npm run db:seed`.

## 3. Vercel

```bash
npm i -g vercel && vercel
```

- Framework preset: Next.js. Build command `npm run build` (runs
  `prisma generate` first via the script).
- Add the env vars above for Production + Preview.
- Database: Vercel Postgres / Neon / Supabase all work — pooled connection
  string in `DATABASE_URL` (add `?pgbouncer=true&connection_limit=1` for
  serverless poolers, or use Prisma Accelerate).
- Webhooks: point Twilio/Vapi at
  `https://<domain>/api/webhooks/telephony`, messaging providers at
  `https://<domain>/api/webhooks/messaging`.

## 4. Self-hosted (Docker outline)

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json prisma ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
```

Run behind a TLS-terminating proxy (Caddy/nginx). The session cookie is
`Secure` in production, so HTTPS is required for login to work.

## 5. Production checklist

- [ ] Strong `AUTH_SECRET`; rotate on compromise (invalidates all sessions)
- [ ] PostgreSQL with automated backups + PITR
- [ ] `prisma migrate deploy` wired into CI (never `db push` in prod)
- [ ] Rate limiting on `/api/auth/*` (Redis) before public launch
- [ ] Error monitoring (Sentry) + uptime checks on `/` and `/api/auth/me`
- [ ] Integration credentials encrypted at rest (KMS) when real OAuth lands
- [ ] Add ESLint/Prettier + CI typecheck/build gates (see ROADMAP debt register)

## 6. Scaling waypoints

1. **Single deployment** (now): Next.js serves UI + API; Postgres.
2. **Queues**: Redis + BullMQ worker dyno for outbound/scheduled calls and
   follow-ups (`Call.status = scheduled` is already the queue's source).
3. **Telephony gateway**: stateful WebSocket service for live audio
   (Twilio Media Streams ↔ STT/TTS ↔ engine). Deploy on a long-lived host
   (Fly.io/Railway/EC2), not serverless.
4. **Service extraction**: ai-engine and integration-hub split out along the
   existing folder seams; event bus between gateway → engine → executor.

# CallOlve AI — Product Roadmap

## Phase 0 — Foundation (this repo)
- ✅ Full-stack platform: auth, assistants, calls, simulator engine,
  automation suite, analytics, integrations hub, SOS pipeline
- ✅ Deterministic conversation engine defining the LLM/voice adapter contract
- ✅ API-first surface (`/api/v1`) consumed by web; ready for mobile/wearables

## Phase 1 — Real voice (production telephony)
- Twilio number provisioning per assistant; inbound webhook → telephony gateway
- Streaming STT (Deepgram) + TTS (ElevenLabs) over Twilio Media Streams
- LLM adapter (Claude) implementing the engine contract (same state/actions)
- Live call monitoring via WebSocket (`/api/v1/live`); barge-in/human takeover
- Outbound + scheduled call worker (Redis/BullMQ)

## Phase 2 — Integrations go live
- HubSpot/Salesforce/Zoho OAuth + bidirectional sync (contacts, deals, activities)
- Google/Outlook Calendar: availability lookup before booking, two-way sync
- WhatsApp Business API + Twilio SMS for confirmations and follow-ups
- Email (Resend) summaries; Instagram/Telegram message ingestion
- Outbound webhooks + API keys for customer systems

## Phase 3 — Intelligence
- Long-term assistant memory (vector store) across calls per contact
- Multi-language conversations (detection + locale-aware slot parsing)
- Automatic follow-up sequences (no-answer → SMS → retry call)
- Smart reminders; AI-suggested prompt improvements from call outcomes
- Multi-agent workflows (receptionist → books with scheduler agent → confirms)

## Phase 4 — SOS productization
- Flutter app (../) wired to `/api/v1/sos`: power-button/shake triggers,
  background location, audio/video evidence upload
- Wearable SDKs (Apple Watch, Wear OS) one-press trigger
- Voice wake-word emergency activation during any call
- Regional emergency routing partners (ambulance/police APIs where available)
- Guardian mode: scheduled check-ins that auto-trigger on miss

## Phase 5 — Enterprise & scale
- Organizations: SSO (SAML/OIDC), SCIM, granular RBAC, department assistants
- Audit log UI, retention policies, data residency, SOC 2 program
- Usage-based billing (Stripe), plan limits, admin analytics
- Service extraction: telephony gateway + AI engine as independent services,
  event bus, horizontal autoscaling
- White-label / reseller program

## Engineering debt register
- Add ESLint + Prettier + CI (typecheck/build/test on PR)
- Unit tests for engine (intent/slot fixtures) and analytics aggregations
- Replace JSON-string columns with `jsonb` after Postgres migration
- Rate limiting + CSRF tokens on auth endpoints
- Social login (Google/Microsoft OAuth) on the existing auth seam

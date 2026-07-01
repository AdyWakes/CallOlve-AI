# CallOlve SOS — Emergency Module Architecture

The SOS module turns the platform's calling/notification machinery into a
personal-safety pipeline. The existing **CallOlve SOS Flutter app** (repo:
`../`, package `callease_sos`) is the mobile trigger client; this platform is
the dispatch brain.

## End-to-end flow

```
TRIGGERS                                 PLATFORM (this repo)
─────────                                ────────────────────
Triple power button ─┐
Wearable press ──────┤   POST /api/v1/sos/events
Voice safe-phrase ───┼──▶ { triggerType, lat?, lng?, address? }
In-app button ───────┤        │
Dashboard button ────┘        ▼
                        sos-service.triggerSos()
                          1. Reject if an event is already active
                          2. Load emergency contacts (priority order)
                          3. buildDispatchTimeline() →
                             triggered → 10s cancel window → location capture
                             → contact alerts (SMS + AI call, by priority)
                             → AI emergency call loop → evidence capture
                          4. Persist SosEvent (append-only timeline)
                          5. Audit log
                              │
                              ▼
                        Dispatch workers (production)
                          · SMS sender (Twilio) with live-location link
                          · AI dialer: calls each contact, relays name,
                            location, and situation; repeats until a human
                            acknowledges; writes who confirmed to the timeline
                          · Media ingest: encrypted audio/video chunks from
                            the mobile app → object storage → URLs on event
                          · Escalation: regional ambulance/police partners
```

In this build the dispatch plan is computed up front with realistic timestamps
and the dashboard plays it back live; production workers append the same
`SosTimelineEntry` shapes as they actually execute. **The UI and data model do
not change** when real dispatch lands — only who writes the entries.

## Trigger architecture

| Trigger | Device mechanism | Notes |
|---|---|---|
| Triple power button | Android: foreground service + `ACTION_SCREEN_ON/OFF` press counting (the Flutter app already requests the needed permissions). iOS: hardware buttons are restricted — use the Action Button (15 Pro+), back-tap accessibility shortcut, or lock-screen widget instead | Works with phone locked |
| Wearable | watchOS/Wear OS companion app or BLE button → app → API | One-press, low latency |
| Voice | Safe-phrase detection in the mobile app's wake-word listener; during AI calls the engine's emergency intent (`lib/ai/intents.ts`) escalates mid-conversation | Silent trigger supported |
| App / dashboard | Direct API call | Also used for drills/testing |

All triggers converge on the same endpoint with the same payload — new trigger
types never touch dispatch logic.

## Mobile client contract (Flutter app)

The app in `../` integrates with three endpoints (session cookie or, later,
device API key):

1. `POST /api/v1/sos/events` — fire an event. Send best-effort `lat/lng`
   immediately; don't wait for a precise fix.
2. `PATCH /api/v1/sos/events/:id` — `{ status: "cancelled" }` within the grace
   window, `resolved` / `false_alarm` after.
3. `GET /api/v1/sos/events/:id` — poll for timeline updates to render the
   in-app live view (WebSocket channel planned).

Media: the app records audio (and optionally video) in 10s chunks, encrypts,
and uploads; the platform attaches URLs to `recordingUrl`/`videoUrl`.
Location: continuous updates stream while the event is active (the current
Flutter MVP already has `geolocator` + `camera` wired for this).

## Safety timeline

Append-only `SosTimelineEntry[]` on the event row:

```ts
{ ts: ISO8601, type: "triggered" | "countdown" | "location" | "contact_notified"
              | "ai_call" | "recording" | "escalation" | "note" | "resolved"
              | "cancelled", label: string, detail?: string }
```

Properties: entries are never mutated or deleted (tamper-evident record for
post-incident review); closing an event appends a resolution entry; events
cancelled inside the grace window drop not-yet-executed steps so the record
reflects reality (no contact appears "notified" who never was).

## Emergency services routing (ambulance / police)

Direct-to-112/911 API access is region-dependent, so the architecture isolates
it behind an `EmergencyDispatchAdapter` (same adapter pattern as integrations):

- **Tier 1 (now):** contacts receive the live location and an AI call that can
  conference in emergency services manually.
- **Tier 2:** partner APIs (e.g., private ambulance networks, security
  services) per region behind the adapter.
- **Tier 3:** certified PSAP integration where legally available (e.g., RapidSOS
  style) — the adapter receives the event, location stream, and a structured
  incident summary generated from the timeline.

Hard rule: automated emergency-service contact is **opt-in per user and per
region**, with the AI clearly identifying itself as an automated call placed on
behalf of a named person.

## Safety & privacy guarantees

- 10-second cancel window before any outbound alert (accidental triggers).
- One active event at a time; re-triggers return the existing event.
- Location is shared only while an event is active.
- Media is encrypted at rest; access is audit-logged.
- Every lifecycle action lands in the audit log (`sos.triggered`, `sos.resolved`, …).
- The dashboard clearly labels simulation mode until real dispatch channels
  (Twilio etc.) are configured.

## Roadmap (see also docs/ROADMAP.md, Phase 4)

Guardian mode (scheduled check-ins that auto-trigger on miss), geofenced
arming, multi-user family dashboards, wearable SDKs, and WebSocket live
timeline streaming.

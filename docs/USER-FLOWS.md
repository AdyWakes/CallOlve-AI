# CallOlve AI — Core User Flows

## 1. Onboarding
```
Landing page → "Start free" → Signup (name, email, password, company?)
→ session created → Dashboard (empty state with guided next steps)
→ "Create your first assistant" CTA → Assistant wizard → Dashboard populated
```

## 2. Create an AI assistant
```
Assistants → New assistant
  Step 1: Identity   — name, business role (receptionist/sales/support/…)
  Step 2: Personality — personality, tone, voice preset, language
  Step 3: Behavior   — greeting, system prompt (template pre-filled per role),
                       memory on/off
→ Review → Create → Assistant detail page (test-call CTA)
```

## 3. Inbound call (production) / simulated call (dev)
```
Caller dials assistant number          Simulator: pick assistant → start call
→ assistant greets (persona greeting)
→ multi-turn conversation: engine detects intent (booking / order / support /
  lead / question), gathers required slots, confirms
→ call ends → transcript + summary + sentiment + extracted actions persisted
→ actions executed: Appointment/Order/Lead created, Contact upserted
→ visible immediately in Calls log, automation pages, and Analytics
```

## 4. Appointment lifecycle
```
Created by AI call (or manually) → pending/confirmed
→ business confirms/completes/cancels from Appointments page
→ status reflected in analytics conversion funnel
```

## 5. Order lifecycle
```
AI takes order (items, qty, pickup/delivery) → status "new"
→ kitchen/staff advance: preparing → ready → fulfilled
```

## 6. Lead qualification
```
AI captures lead (name, phone, interest) + scores it (0–100, slot completeness
& buying signals) → sales reviews pipeline → qualified → contacted → converted
```

## 7. Connect an integration
```
Integrations → provider card (HubSpot / Google Calendar / WhatsApp / …)
→ Connect → OAuth (mocked in dev) → status "connected"
→ AI actions now sync: CRM updates, calendar event creation, message sending
```

## 8. Team management (enterprise)
```
Settings → Team → invite member (email, role admin/member)
→ member sees org assistants & calls per role permissions
→ owner reviews audit log
```

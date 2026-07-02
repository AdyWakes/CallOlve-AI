/**
 * CallOlve AI — demo seed.
 *
 * Creates the demo workspace (demo@callolve.ai / demo1234) with assistants,
 * a month of realistic call history, linked appointments/orders/leads,
 * contacts, and integrations.
 *
 * Deterministic: same RNG seed → same dataset.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { toJson } from "../src/lib/json";
import { priceFor } from "../src/lib/ai/slots";
import type {
  ExtractedAction,
  Intent,
  Outcome,
  Sentiment,
  TranscriptTurn,
} from "../src/lib/types";

const db = new PrismaClient();

// ── deterministic RNG
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;
const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

const CALLERS = [
  { name: "Priya Sharma", phone: "5550182345" },
  { name: "Marco Rossi", phone: "5550197654" },
  { name: "Sarah Kim", phone: "5550114523" },
  { name: "James Okafor", phone: "5550129876" },
  { name: "Lucía Fernández", phone: "5550143210" },
  { name: "Dev Patel", phone: "5550156789" },
  { name: "Emma Walsh", phone: "5550168901" },
  { name: "Tom Becker", phone: "5550172345" },
  { name: "Aisha Khan", phone: "5550185678" },
  { name: "Liam O'Brien", phone: "5550190123" },
  { name: "Nina Volkov", phone: "5550102468" },
  { name: "Carlos Mendez", phone: "5550113579" },
  { name: "Grace Liu", phone: "5550124680" },
  { name: "Omar Haddad", phone: "5550135791" },
] as const;

const SERVICES = [
  "Table reservation (party of 2)",
  "Table reservation (party of 4)",
  "Table reservation (party of 6)",
  "Dinner booking",
  "Private dining consultation",
  "Tasting menu reservation",
] as const;

const MENU = [
  "margherita pizza",
  "pepperoni pizza",
  "truffle pasta",
  "caesar salad",
  "tiramisu",
  "garlic bread",
  "lasagna",
  "coke",
  "sparkling water",
  "house red wine",
] as const;

const ISSUES = [
  "My delivery order never arrived and the app says it was delivered",
  "I was charged twice for the same reservation deposit",
  "The food arrived cold and one dish was missing",
  "I need to change a reservation but the website keeps erroring",
] as const;

const INTERESTS = [
  "private event catering for about 40 people",
  "the chef's table experience pricing",
  "weekly corporate lunch delivery",
  "hosting a birthday dinner for 12",
] as const;

const QUESTIONS = [
  "What are your opening hours this weekend?",
  "Do you have parking nearby?",
  "Do you take card payments?",
  "Where exactly are you located?",
] as const;

// ── transcript builders

function turns(lines: [("assistant" | "caller"), string][]): TranscriptTurn[] {
  let at = 0;
  return lines.map(([speaker, text]) => {
    const turn = { speaker, text, at };
    at += randInt(6, 14);
    return turn;
  });
}

function bookingTranscript(assistant: string, caller: string, service: string, when: string) {
  return turns([
    ["assistant", `Thank you for calling! This is ${assistant}. How can I help you today?`],
    ["caller", `Hi, I'd like to book a ${service.toLowerCase()} ${when}.`],
    ["assistant", `Absolutely! ${service} ${when} — may I have a name for the booking?`],
    ["caller", `It's ${caller}.`],
    ["assistant", `Thank you, ${caller.split(" ")[0]}. And a phone number for confirmations?`],
    ["caller", "Sure, it's on this number."],
    ["assistant", `Perfect. To confirm: ${service} ${when} for ${caller}. Shall I book it?`],
    ["caller", "Yes, please."],
    ["assistant", "You're all set! A confirmation text is on its way. Anything else I can help with?"],
    ["caller", "No, that's all. Thanks!"],
    ["assistant", "Thanks so much for calling — have a wonderful day!"],
  ]);
}

function orderTranscript(assistant: string, caller: string, items: { name: string; qty: number }[], total: string) {
  const itemsText = items.map((i) => (i.qty > 1 ? `${i.qty}× ${i.name}` : i.name)).join(", ");
  return turns([
    ["assistant", `Thank you for calling! This is ${assistant}. How can I help you today?`],
    ["caller", `Hi, I'd like to order ${itemsText}.`],
    ["assistant", `Great choice! I have ${itemsText}. Anything else?`],
    ["caller", "That's everything."],
    ["assistant", "Will that be pickup or delivery?"],
    ["caller", "Pickup, please."],
    ["assistant", `Got it. Can I get a name for the order?`],
    ["caller", caller],
    ["assistant", `Let me read that back: ${itemsText}, for pickup, under ${caller}. Your total is ${total}. Shall I place it?`],
    ["caller", "Yes!"],
    ["assistant", "Order placed! It'll be ready in about 20 minutes. Anything else?"],
    ["caller", "Nope, that's it. Bye!"],
    ["assistant", "Thanks so much for calling — have a wonderful day!"],
  ]);
}

function supportTranscript(assistant: string, caller: string, issue: string) {
  return turns([
    ["assistant", `Hi, this is ${assistant} from support. Tell me what's going on and we'll sort it out.`],
    ["caller", issue],
    ["assistant", "I'm so sorry about that — thank you for explaining. I'm writing this up for the team right now. Can I get your name?"],
    ["caller", caller],
    ["assistant", `Thanks, ${caller.split(" ")[0]}. The best number to follow up on is this one?`],
    ["caller", "Yes, this number works."],
    ["assistant", "You're in the queue — a specialist will call you back within a few hours with a resolution. Anything else?"],
    ["caller", "No, that's all."],
    ["assistant", "Thank you for your patience. Take care."],
  ]);
}

function leadTranscript(assistant: string, caller: string, interest: string) {
  return turns([
    ["assistant", `Hi, you've reached ${assistant} on the sales team. What can I help you find today?`],
    ["caller", `Hi! I'm interested in ${interest}. Can you tell me more?`],
    ["assistant", "Happy to help with that. So I can point you to the right specialist — what timeline are you working with?"],
    ["caller", pick(["Sometime next month.", "As soon as possible!", "Just exploring options for now."])],
    ["assistant", "Great. And may I have your name?"],
    ["caller", caller],
    ["assistant", `Perfect, ${caller.split(" ")[0]} — our specialist will reach out shortly with details. Anything else?`],
    ["caller", "That's everything, thank you!"],
    ["assistant", "Thanks for calling — talk soon!"],
  ]);
}

function questionTranscript(assistant: string, q: string, a: string) {
  return turns([
    ["assistant", `Thank you for calling! This is ${assistant}. How can I help you today?`],
    ["caller", q],
    ["assistant", `${a} Is there anything else I can help with?`],
    ["caller", "No, that's all I needed. Thanks!"],
    ["assistant", "Thanks so much for calling — have a wonderful day!"],
  ]);
}

const QUESTION_ANSWERS: Record<string, string> = {
  [QUESTIONS[0]]: "We're open Monday to Saturday from 9 AM to 9 PM, and Sundays from 10 AM to 6 PM.",
  [QUESTIONS[1]]: "Yes — free parking is available right behind the building.",
  [QUESTIONS[2]]: "We accept all major cards, mobile payments, and cash.",
  [QUESTIONS[3]]: "We're at 128 Harbor Street, downtown — two blocks from the central station.",
};

async function main() {
  console.log("Seeding CallOlve AI demo data…");

  // wipe (idempotent reseed)
  await db.auditLog.deleteMany();
  await db.integration.deleteMany();
  await db.lead.deleteMany();
  await db.order.deleteMany();
  await db.appointment.deleteMany();
  await db.contact.deleteMany();
  await db.call.deleteMany();
  await db.assistant.deleteMany();
  await db.user.deleteMany();
  await db.organization.deleteMany();

  const org = await db.organization.create({
    data: {
      name: "Bella Cucina Group",
      slug: "bella-cucina",
      industry: "restaurant",
      plan: "pro",
    },
  });

  const passwordHash = await hashPassword("demo1234");
  const user = await db.user.create({
    data: {
      email: "demo@callolve.ai",
      passwordHash,
      name: "Alex Carter",
      phone: "5550100000",
      role: "owner",
      timezone: "America/New_York",
      organizationId: org.id,
    },
  });
  await db.user.create({
    data: {
      email: "maya@callolve.ai",
      passwordHash,
      name: "Maya Patel",
      role: "admin",
      timezone: "America/New_York",
      organizationId: org.id,
    },
  });

  const [nova, aria, sage] = await Promise.all([
    db.assistant.create({
      data: {
        userId: user.id,
        name: "Nova",
        role: "receptionist",
        personality: "friendly",
        tone: "warm",
        voice: "nova",
        greeting: "Thank you for calling Bella Cucina! This is Nova. How can I help you today?",
        systemPrompt:
          "You are the front-desk receptionist for Bella Cucina, an Italian restaurant. " +
          "Answer questions about hours, location, and the menu. Book table reservations by " +
          "collecting party size, date, time, name, and phone number. Always be concise and " +
          "confirm details before booking.",
        memoryEnabled: true,
        memoryNotes: toJson([
          "Priya Sharma (5550182345): regular guest, prefers window tables, vegetarian.",
          "Marco Rossi (5550197654): books the private room monthly for business dinners.",
        ]),
        status: "active",
        phoneNumber: "+1 (555) 014-2200",
        color: "#22d3ee",
      },
    }),
    db.assistant.create({
      data: {
        userId: user.id,
        name: "Aria",
        role: "sales",
        personality: "energetic",
        tone: "casual",
        voice: "aria",
        greeting: "Hi, you've reached Aria on the Bella Cucina events team. What can I help you plan?",
        systemPrompt:
          "You handle catering and private-event inquiries. Qualify every caller: event type, " +
          "headcount, date, and budget signals. Capture name and phone, then book a follow-up with " +
          "the events manager.",
        memoryEnabled: true,
        status: "active",
        phoneNumber: "+1 (555) 014-2201",
        color: "#8b5cf6",
      },
    }),
    db.assistant.create({
      data: {
        userId: user.id,
        name: "Sage",
        role: "support",
        personality: "calm",
        tone: "warm",
        voice: "sage",
        greeting: "Hi, this is Sage from Bella Cucina support. Tell me what's going on and we'll sort it out.",
        systemPrompt:
          "You resolve order and reservation issues. Gather full details, apologize sincerely, " +
          "resolve what you can directly, and escalate the rest with a clear summary and callback.",
        memoryEnabled: true,
        status: "paused",
        color: "#34d399",
      },
    }),
  ]);

  // ── a month of calls
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  let booked = 0;
  let ordered = 0;
  let leads = 0;

  for (let i = 0; i < 60; i++) {
    const caller = pick(CALLERS);
    const daysAgo = Math.floor(rand() * rand() * 30); // recent-weighted
    const date = new Date(now - daysAgo * DAY);
    date.setHours(randInt(9, 20), randInt(0, 59), 0, 0);
    if (date.getTime() > now) date.setTime(now - randInt(1, 5) * 60 * 60 * 1000);

    const roll = rand();
    const missed = rand() < 0.08;

    if (missed) {
      await db.call.create({
        data: {
          userId: user.id,
          assistantId: pick([nova.id, aria.id]),
          direction: "inbound",
          status: "missed",
          callerName: rand() < 0.5 ? caller.name : null,
          callerPhone: caller.phone,
          startedAt: date,
          durationSec: 0,
          outcome: "no_answer",
          summary: "Missed call — assistant line was busy. Follow-up suggested.",
        },
      });
      continue;
    }

    let intent: Intent;
    let outcome: Outcome;
    let assistantRec = nova;
    let transcript: TranscriptTurn[];
    let actions: ExtractedAction[] = [];
    let summary: string;
    let sentiment: Sentiment = "positive";
    let appointmentData: { service: string; startsAt: Date } | null = null;
    let orderData: { items: { name: string; qty: number; priceCents: number }[]; total: number } | null = null;
    let leadData: { interest: string; score: number } | null = null;

    if (roll < 0.38) {
      intent = "book_appointment";
      outcome = "booked";
      const service = pick(SERVICES);
      const offset = randInt(1, 6);
      const startsAt = new Date(date.getTime() + offset * DAY);
      startsAt.setHours(randInt(17, 21), pick([0, 15, 30, 45] as const), 0, 0);
      const when = `on ${startsAt.toLocaleDateString("en-US", { weekday: "long" })} at ${startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
      transcript = bookingTranscript(nova.name, caller.name, service, when);
      summary = `${caller.name} booked ${service} ${when}. Confirmation SMS sent.`;
      actions = [
        { type: "book_appointment", label: `Book ${service}`, payload: { service }, status: "executed" },
        { type: "send_message", label: "Send booking confirmation SMS", payload: { channel: "sms" }, status: "executed" },
      ];
      appointmentData = { service, startsAt };
      booked++;
    } else if (roll < 0.58) {
      intent = "place_order";
      outcome = "order_placed";
      const items = Array.from({ length: randInt(1, 3) }, () => ({
        name: pick(MENU),
        qty: randInt(1, 2),
        priceCents: 0,
      })).map((i) => ({ ...i, priceCents: priceFor(i.name) }));
      const total = items.reduce((s, i) => s + i.priceCents * i.qty, 0);
      const totalText = `$${(total / 100).toFixed(2)}`;
      transcript = orderTranscript(nova.name, caller.name, items, totalText);
      summary = `${caller.name} placed a pickup order: ${items.map((i) => `${i.qty}× ${i.name}`).join(", ")} (${totalText}).`;
      actions = [
        { type: "create_order", label: `Order: ${items.map((i) => i.name).join(", ")}`, payload: {}, status: "executed" },
        { type: "send_message", label: "Send order confirmation SMS", payload: { channel: "sms" }, status: "executed" },
      ];
      orderData = { items, total };
      ordered++;
    } else if (roll < 0.73) {
      intent = "support";
      outcome = "escalated";
      sentiment = pick(["neutral", "negative", "neutral"] as const);
      assistantRec = sage;
      const issue = pick(ISSUES);
      transcript = supportTranscript(sage.name, caller.name, issue);
      summary = `${caller.name} reported an issue: "${issue}". Escalated with a callback scheduled.`;
      actions = [
        { type: "escalate", label: "Escalate to human team", payload: { issue }, status: "executed" },
        { type: "schedule_callback", label: `Callback for ${caller.name}`, payload: {}, status: "executed" },
      ];
    } else if (roll < 0.88) {
      intent = "lead_inquiry";
      outcome = "lead_captured";
      assistantRec = aria;
      const interest = pick(INTERESTS);
      transcript = leadTranscript(aria.name, caller.name, interest);
      summary = `${caller.name} inquired about ${interest}. Lead captured and routed to the events manager.`;
      const score = randInt(55, 95);
      actions = [
        { type: "capture_lead", label: `New lead: ${caller.name}`, payload: { score }, status: "executed" },
        { type: "update_crm", label: "Sync lead to CRM", payload: {}, status: "executed" },
      ];
      leadData = { interest, score };
      leads++;
    } else {
      intent = "question";
      outcome = "resolved";
      const q = pick(QUESTIONS);
      transcript = questionTranscript(nova.name, q, QUESTION_ANSWERS[q]!);
      summary = `${caller.name} asked: "${q}" — answered immediately.`;
    }

    const durationSec = (transcript.at(-1)?.at ?? 60) + randInt(4, 10);
    const satisfaction =
      sentiment === "positive" ? pick([4, 5, 5] as const) : sentiment === "neutral" ? 3 : 2;

    const call = await db.call.create({
      data: {
        userId: user.id,
        assistantId: assistantRec.id,
        direction: "inbound",
        status: "completed",
        callerName: caller.name,
        callerPhone: caller.phone,
        startedAt: date,
        endedAt: new Date(date.getTime() + durationSec * 1000),
        durationSec,
        intent,
        outcome,
        sentiment,
        satisfaction,
        summary,
        transcript: toJson(transcript),
        actions: toJson(actions),
      },
    });

    if (appointmentData) {
      const past = appointmentData.startsAt.getTime() < now;
      await db.appointment.create({
        data: {
          userId: user.id,
          callId: call.id,
          contactName: caller.name,
          contactPhone: caller.phone,
          service: appointmentData.service,
          startsAt: appointmentData.startsAt,
          durationMin: 90,
          status: past ? pick(["completed", "completed", "no_show"] as const) : pick(["confirmed", "confirmed", "pending"] as const),
          notes: "Booked by AI assistant",
        },
      });
    }
    if (orderData) {
      const ageDays = (now - date.getTime()) / DAY;
      await db.order.create({
        data: {
          userId: user.id,
          callId: call.id,
          contactName: caller.name,
          contactPhone: caller.phone,
          items: toJson(orderData.items),
          totalCents: orderData.total,
          type: pick(["pickup", "pickup", "delivery"] as const),
          status: ageDays > 1 ? "fulfilled" : pick(["new", "preparing", "ready"] as const),
          notes: "Taken by AI assistant",
          createdAt: date,
        },
      });
    }
    if (leadData) {
      const ageDays = (now - date.getTime()) / DAY;
      await db.lead.create({
        data: {
          userId: user.id,
          callId: call.id,
          name: caller.name,
          phone: caller.phone,
          interest: leadData.interest,
          score: leadData.score,
          source: "inbound_call",
          status:
            ageDays > 14
              ? pick(["converted", "contacted", "lost"] as const)
              : ageDays > 5
                ? pick(["qualified", "contacted"] as const)
                : "new",
          notes: "Captured by AI assistant",
          createdAt: date,
        },
      });
    }

    await db.contact.upsert({
      where: { userId_phone: { userId: user.id, phone: caller.phone } },
      update: { lastCallAt: date },
      create: {
        userId: user.id,
        name: caller.name,
        phone: caller.phone,
        lastCallAt: date,
        tags: toJson(["caller"]),
      },
    });
  }

  // scheduled outbound follow-ups
  for (let i = 0; i < 3; i++) {
    const caller = pick(CALLERS);
    const when = new Date(now + randInt(1, 4) * DAY);
    when.setHours(randInt(10, 17), 0, 0, 0);
    await db.call.create({
      data: {
        userId: user.id,
        assistantId: aria.id,
        direction: "outbound",
        status: "scheduled",
        callerName: caller.name,
        callerPhone: caller.phone,
        startedAt: when,
        scheduledFor: when,
        intent: "lead_inquiry",
        summary: "Scheduled follow-up call on an open inquiry.",
      },
    });
  }

  // integrations
  await db.integration.createMany({
    data: [
      {
        userId: user.id,
        provider: "google_calendar",
        category: "calendar",
        status: "connected",
        connectedAt: new Date(now - 20 * DAY),
        config: toJson({ calendarId: "primary" }),
      },
      {
        userId: user.id,
        provider: "whatsapp",
        category: "messaging",
        status: "connected",
        connectedAt: new Date(now - 12 * DAY),
        config: toJson({ businessNumber: "+1 555 014 2200" }),
      },
      {
        userId: user.id,
        provider: "sms",
        category: "messaging",
        status: "error",
        connectedAt: new Date(now - 30 * DAY),
        config: toJson({ lastError: "Sender number verification expired" }),
      },
    ],
  });

  await db.auditLog.createMany({
    data: [
      { userId: user.id, action: "account.created", target: user.id, createdAt: new Date(now - 32 * DAY) },
      { userId: user.id, action: "assistant.created", target: nova.id, createdAt: new Date(now - 31 * DAY) },
      { userId: user.id, action: "assistant.created", target: aria.id, createdAt: new Date(now - 30 * DAY) },
      { userId: user.id, action: "assistant.created", target: sage.id, createdAt: new Date(now - 28 * DAY) },
      { userId: user.id, action: "integration.connected", target: "google_calendar", createdAt: new Date(now - 20 * DAY) },
    ],
  });

  const counts = {
    calls: await db.call.count(),
    appointments: await db.appointment.count(),
    orders: await db.order.count(),
    leads: await db.lead.count(),
    contacts: await db.contact.count(),
  };
  console.log(
    `Seeded: ${counts.calls} calls (${booked} bookings, ${ordered} orders, ${leads} leads), ` +
      `${counts.appointments} appointments, ${counts.orders} orders, ${counts.leads} leads, ${counts.contacts} contacts.`
  );
  console.log("Demo login: demo@callolve.ai / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

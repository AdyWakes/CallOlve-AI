/**
 * Engine smoke test: drives the conversation engine through the four core
 * flows and asserts intents, outcomes, and extracted actions.
 *
 * Run: npx tsx scripts/engine-smoke.ts
 */
import {
  respond,
  startConversation,
  type AssistantPersona,
  type ConversationState,
} from "../src/lib/ai/engine";

const persona: AssistantPersona = {
  name: "Nova",
  greeting: "Thank you for calling! This is Nova. How can I help you today?",
  personality: "friendly",
  tone: "warm",
};

let failures = 0;

function check(label: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`  ✔ ${label}`);
  } else {
    failures++;
    console.error(`  ✘ ${label}`, extra ?? "");
  }
}

function converse(label: string, utterances: string[]): ConversationState {
  console.log(`\n── ${label}`);
  const start = startConversation(persona);
  console.log(`  AI: ${start.reply}`);
  let state = start.state;
  for (const u of utterances) {
    console.log(`  Caller: ${u}`);
    const turn = respond(persona, state, u);
    state = turn.state;
    console.log(`  AI: ${turn.reply}`);
    if (turn.done) break;
  }
  return state;
}

// 1 ── Booking
{
  const state = converse("Booking flow", [
    "Hi, I'd like to book a table for 4 tomorrow at 7pm",
    "My name is Priya Sharma",
    "My number is 555 018 2345",
    "Yes, please book it",
    "No, that's all, thanks!",
  ]);
  check("intent = book_appointment", state.intent === "book_appointment", state.intent);
  check("outcome = booked", state.outcome === "booked", state.outcome);
  check("party size = 4", state.slots.partySize === 4, state.slots.partySize);
  check("name captured", state.slots.name === "Priya Sharma", state.slots.name);
  check("phone captured", state.slots.phone === "5550182345", state.slots.phone);
  check(
    "book_appointment action",
    state.actions.some((a) => a.type === "book_appointment")
  );
  check("sms action", state.actions.some((a) => a.type === "send_message"));
  check("startsAt resolved", Boolean(state.slots.startsAtIso), state.slots);
  check("call done", state.done);
}

// 2 ── Order
{
  const state = converse("Order flow", [
    "Hey, I'd like to order two margherita pizzas and a coke",
    "That's everything",
    "Pickup please",
    "Dev",
    "My number is 555 123 4567",
    "Yes",
    "Nope, that's it. Bye!",
  ]);
  check("intent = place_order", state.intent === "place_order", state.intent);
  check("outcome = order_placed", state.outcome === "order_placed", state.outcome);
  check("2 items", (state.slots.items?.length ?? 0) === 2, state.slots.items);
  check(
    "pizza qty = 2",
    state.slots.items?.find((i) => i.name.includes("pizza"))?.qty === 2,
    state.slots.items
  );
  check("order type = pickup", state.slots.orderType === "pickup");
  check("create_order action", state.actions.some((a) => a.type === "create_order"));
  check("call done", state.done);
}

// 3 ── Lead
{
  const state = converse("Lead flow", [
    "Hi, is the 2 bedroom apartment still available? I'm very interested in pricing",
    "As soon as possible, I'm ready to move this month",
    "Sarah Kim",
    "555 987 6543",
    "No thanks, goodbye",
  ]);
  check("intent = lead_inquiry", state.intent === "lead_inquiry", state.intent);
  check("outcome = lead_captured", state.outcome === "lead_captured", state.outcome);
  const lead = state.actions.find((a) => a.type === "capture_lead");
  check("capture_lead action", Boolean(lead));
  check(
    "lead score boosted by urgency",
    ((lead?.payload.score as number) ?? 0) >= 80,
    lead?.payload
  );
  check("call done", state.done);
}

// 4 ── Support
{
  const state = converse("Support flow", [
    "My order arrived damaged and I want a refund",
    "The box was crushed and the lamp inside is broken",
    "James Okafor",
    "555 765 4321",
    "That's all",
  ]);
  check("intent = support", state.intent === "support", state.intent);
  check("outcome = escalated", state.outcome === "escalated", state.outcome);
  check("escalate action", state.actions.some((a) => a.type === "escalate"));
  check(
    "callback action",
    state.actions.some((a) => a.type === "schedule_callback")
  );
  check("call done", state.done);
}

// 5 ── Question
{
  const state = converse("Question flow", [
    "What are your hours on Saturday?",
    "No that's all I needed",
  ]);
  check("intent = question", state.intent === "question", state.intent);
  check("outcome = resolved", state.outcome === "resolved", state.outcome);
  check("call done", state.done);
}

console.log(
  failures === 0
    ? "\nAll engine smoke tests passed ✔"
    : `\n${failures} engine smoke test(s) FAILED ✘`
);
process.exit(failures === 0 ? 0 : 1);

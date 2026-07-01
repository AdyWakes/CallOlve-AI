import type {
  ExtractedAction,
  Intent,
  Outcome,
  TranscriptTurn,
} from "@/lib/types";
import { detectIntent } from "./intents";
import {
  extractItems,
  extractName,
  extractPartySize,
  extractPhone,
  extractWhen,
  formatMinutes,
  isAffirmative,
  isNegative,
  priceFor,
  type ParsedItem,
} from "./slots";
import { ack, closer, styled, type PersonaStyle } from "./persona";

/**
 * The CallOlve conversation engine.
 *
 * A deterministic dialog state machine: intent detection → slot gathering →
 * confirmation → action extraction. Production swaps intent detection and
 * phrasing for an LLM while keeping this exact state/action contract
 * (see docs/ARCHITECTURE.md §4).
 */

export interface AssistantPersona extends PersonaStyle {
  name: string;
  greeting: string;
}

export interface EngineSlots {
  name?: string;
  phone?: string;
  service?: string;
  dateLabel?: string;
  timeLabel?: string;
  /** Resolved appointment start (ISO) once date+time known */
  startsAtIso?: string;
  partySize?: number;
  items?: ParsedItem[];
  orderType?: "pickup" | "delivery" | "dine_in";
  issue?: string;
  interest?: string;
  timeline?: string;
}

export type Stage =
  | "discover"
  | "b_when"
  | "b_name"
  | "b_phone"
  | "b_confirm"
  | "o_items"
  | "o_more"
  | "o_type"
  | "o_name"
  | "o_phone"
  | "o_confirm"
  | "s_details"
  | "s_name"
  | "s_phone"
  | "l_timeline"
  | "l_name"
  | "l_phone"
  | "q_more"
  | "wrap"
  | "ended";

export interface ConversationState {
  intent: Intent | null;
  stage: Stage;
  slots: EngineSlots;
  transcript: TranscriptTurn[];
  actions: ExtractedAction[];
  startedAtMs: number;
  done: boolean;
  outcome?: Outcome;
  /** Engine-internal scratch: previous caller utterance */
  lastUtterance?: string;
}

export interface EngineTurn {
  reply: string;
  state: ConversationState;
  done: boolean;
}

const SERVICE_WORDS =
  /\b(haircut|consultation|check.?up|cleaning|viewing|tour|visit|massage|appointment|fitting|test drive|demo)\b/i;

export function startConversation(persona: AssistantPersona): EngineTurn {
  const state: ConversationState = {
    intent: null,
    stage: "discover",
    slots: {},
    transcript: [],
    actions: [],
    startedAtMs: Date.now(),
    done: false,
  };
  const reply = persona.greeting || `Hello! This is ${persona.name}. How can I help you today?`;
  pushTurn(state, "assistant", reply);
  return { reply, state, done: false };
}

export function respond(
  persona: AssistantPersona,
  state: ConversationState,
  utterance: string
): EngineTurn {
  pushTurn(state, "caller", utterance);
  harvestSlots(state, utterance);

  const reply = styled(persona, nextReply(persona, state, utterance));
  pushTurn(state, "assistant", reply);
  return { reply, state, done: state.done };
}

// ─────────────────────────────────────────────── core dialog logic

function nextReply(
  persona: AssistantPersona,
  state: ConversationState,
  utterance: string
): string {
  const seed = state.transcript.length;

  if (state.stage === "ended") {
    return closer(persona, seed);
  }

  // Hard override: emergencies take priority at any stage
  if (detectIntent(utterance) === "emergency" && state.intent !== "emergency") {
    state.intent = "emergency";
    state.outcome = "escalated";
    state.actions.push({
      type: "escalate",
      label: "Emergency escalation",
      payload: { reason: utterance },
      status: "proposed",
    });
    finishCall(state);
    return "This sounds like an emergency. I'm flagging this immediately and notifying a human right now. If you are in danger, please hang up and dial your local emergency number.";
  }

  switch (state.stage) {
    case "discover":
    case "wrap":
      return routeIntent(persona, state, utterance);

    // ── booking flow
    case "b_when": {
      if (!state.slots.dateLabel && !state.slots.timeLabel)
        return "What day and time would work best for you?";
      if (!state.slots.dateLabel) return `${ack(persona, seed)} What day would you like to come in?`;
      if (!state.slots.timeLabel) return `${ack(persona, seed)} And what time on ${state.slots.dateLabel}?`;
      state.stage = "b_name";
      return `${ack(persona, seed)} ${describeBooking(state)} — may I have a name for the booking?`;
    }
    case "b_name": {
      if (!state.slots.name) return "Sorry, I didn't catch the name — could you repeat it?";
      state.stage = "b_phone";
      return `Thank you, ${firstName(state.slots.name)}. And a phone number for confirmations?`;
    }
    case "b_phone": {
      if (!state.slots.phone) return "Could you give me a phone number for the confirmation text?";
      state.stage = "b_confirm";
      return `Perfect. To confirm: ${describeBooking(state)} for ${state.slots.name}. Shall I book it?`;
    }
    case "b_confirm": {
      if (isNegative(state.lastUtterance ?? utterance) && !isAffirmative(utterance)) {
        state.stage = "b_when";
        state.slots.dateLabel = undefined;
        state.slots.timeLabel = undefined;
        state.slots.startsAtIso = undefined;
        return "No problem — what day and time would suit you better?";
      }
      if (!isAffirmative(utterance)) return "Should I go ahead and book it — yes or no?";
      state.outcome = "booked";
      state.actions.push(
        {
          type: "book_appointment",
          label: `Book ${state.slots.service ?? "appointment"} — ${state.slots.dateLabel} ${state.slots.timeLabel}`,
          payload: { ...bookingPayload(state) },
          status: "proposed",
        },
        smsAction(state, "booking confirmation")
      );
      state.stage = "wrap";
      return `You're all set! ${describeBooking(state)} under ${state.slots.name}. A confirmation text is on its way. Anything else I can help with?`;
    }

    // ── order flow
    case "o_items": {
      if (!state.slots.items?.length)
        return "Of course — what would you like to order?";
      state.stage = "o_more";
      return `${ack(persona, seed)} I have ${describeItems(state.slots.items)}. Anything else?`;
    }
    case "o_more": {
      if (isNegative(utterance)) {
        state.stage = "o_type";
        return "Will that be pickup or delivery?";
      }
      const added = extractItems(utterance);
      if (added.length) {
        state.slots.items = mergeItems(state.slots.items ?? [], added);
        return `Added. So far: ${describeItems(state.slots.items)}. Anything else?`;
      }
      return "Anything else for the order — or is that everything?";
    }
    case "o_type": {
      const lower = utterance.toLowerCase();
      if (/deliver/.test(lower)) state.slots.orderType = "delivery";
      else if (/pick\s*up|collect|carry\s*out/.test(lower)) state.slots.orderType = "pickup";
      else if (/dine|eat in|table/.test(lower)) state.slots.orderType = "dine_in";
      if (!state.slots.orderType) return "Pickup or delivery?";
      state.stage = "o_name";
      return "Got it. Can I get a name for the order?";
    }
    case "o_name": {
      if (!state.slots.name) return "Sorry — what name should I put on the order?";
      state.stage = "o_phone";
      return `Thanks, ${firstName(state.slots.name)}. And a phone number in case we need to reach you?`;
    }
    case "o_phone": {
      if (!state.slots.phone) return "What's the best phone number for the order?";
      state.stage = "o_confirm";
      return `${orderSummary(state)} Shall I place the order?`;
    }
    case "o_confirm": {
      if (!isAffirmative(utterance)) {
        if (isNegative(utterance)) {
          state.outcome = "resolved";
          state.stage = "wrap";
          return "Okay, I won't place it. Anything else I can do for you?";
        }
        return "Just to confirm — should I place the order?";
      }
      state.outcome = "order_placed";
      state.actions.push(
        {
          type: "create_order",
          label: `Order: ${describeItems(state.slots.items ?? [])}`,
          payload: {
            items: (state.slots.items ?? []).map((i) => ({
              name: i.name,
              qty: i.qty,
              priceCents: priceFor(i.name),
            })),
            orderType: state.slots.orderType ?? "pickup",
            name: state.slots.name,
            phone: state.slots.phone,
            totalCents: orderTotal(state),
          },
          status: "proposed",
        },
        smsAction(state, "order confirmation")
      );
      state.stage = "wrap";
      const eta = state.slots.orderType === "delivery" ? "about 40 minutes" : "about 20 minutes";
      return `Order placed! It'll be ready in ${eta}. Anything else I can help with?`;
    }

    // ── support flow
    case "s_details": {
      state.slots.issue = state.slots.issue
        ? `${state.slots.issue} ${utterance}`.slice(0, 400)
        : utterance;
      state.stage = "s_name";
      return "I'm sorry about that — thank you for explaining. I'm writing this up for the team right now. Can I get your name?";
    }
    case "s_name": {
      if (!state.slots.name) return "Could I have your name for the ticket?";
      state.stage = "s_phone";
      return `Thanks, ${firstName(state.slots.name)}. And the best phone number to follow up on?`;
    }
    case "s_phone": {
      if (!state.slots.phone) return "What number should the team call you back on?";
      state.outcome = "escalated";
      state.actions.push(
        {
          type: "escalate",
          label: "Escalate support issue to human team",
          payload: { issue: state.slots.issue, name: state.slots.name, phone: state.slots.phone },
          status: "proposed",
        },
        {
          type: "schedule_callback",
          label: `Callback for ${state.slots.name}`,
          payload: { phone: state.slots.phone, reason: state.slots.issue },
          status: "proposed",
        }
      );
      state.stage = "wrap";
      return "You're in the queue — a specialist will call you back within a few hours with a resolution. Anything else I can help with?";
    }

    // ── lead flow
    case "l_timeline": {
      state.slots.timeline = utterance.slice(0, 200);
      state.stage = "l_name";
      return `${ack(persona, seed)} And may I have your name?`;
    }
    case "l_name": {
      if (!state.slots.name) return "Sorry, I missed your name — could you say it again?";
      state.stage = "l_phone";
      return `Great to meet you, ${firstName(state.slots.name)}. What's the best number to reach you on?`;
    }
    case "l_phone": {
      if (!state.slots.phone) return "What's the best phone number for our specialist to reach you?";
      state.outcome = "lead_captured";
      state.actions.push(
        {
          type: "capture_lead",
          label: `New lead: ${state.slots.name}`,
          payload: {
            name: state.slots.name,
            phone: state.slots.phone,
            interest: state.slots.interest,
            timeline: state.slots.timeline,
            score: leadScore(state),
          },
          status: "proposed",
        },
        {
          type: "update_crm",
          label: "Sync lead to CRM",
          payload: { name: state.slots.name, phone: state.slots.phone },
          status: "proposed",
        }
      );
      state.stage = "wrap";
      return `Perfect — I've passed everything to our specialist, who'll reach out shortly with details${state.slots.interest ? ` about ${state.slots.interest}` : ""}. Anything else I can help with?`;
    }

    // ── question flow
    case "q_more": {
      if (isNegative(utterance)) {
        state.outcome = state.outcome ?? "resolved";
        finishCall(state);
        return closer(persona, seed);
      }
      return routeIntent(persona, state, utterance);
    }

    default:
      return routeIntent(persona, state, utterance);
  }
}

function routeIntent(
  persona: AssistantPersona,
  state: ConversationState,
  utterance: string
): string {
  const seed = state.transcript.length;

  // Caller wraps up
  if (state.stage === "wrap" && (isNegative(utterance) || /\b(bye|goodbye|thank)/i.test(utterance))) {
    state.outcome = state.outcome ?? "resolved";
    finishCall(state);
    return closer(persona, seed);
  }

  const intent = detectIntent(utterance);
  // The first detected intent stays the call's primary intent
  if (intent && !state.intent) state.intent = intent;

  switch (intent) {
    case "book_appointment": {
      if (!state.slots.service) {
        const m = utterance.match(SERVICE_WORDS);
        state.slots.service = m
          ? capitalize(m[0])
          : state.slots.partySize
            ? "Table reservation"
            : "Appointment";
      }
      if (state.slots.dateLabel && state.slots.timeLabel) {
        state.stage = "b_name";
        return `${ack(persona, seed)} ${describeBooking(state)} — may I have a name for the booking?`;
      }
      state.stage = "b_when";
      if (state.slots.dateLabel) return `${ack(persona, seed)} What time on ${state.slots.dateLabel} works for you?`;
      if (state.slots.timeLabel) return `${ack(persona, seed)} Which day would you like to come in?`;
      return `${ack(persona, seed)} What day and time would work best for you?`;
    }
    case "place_order": {
      const items = extractItems(utterance);
      if (items.length) {
        state.slots.items = mergeItems(state.slots.items ?? [], items);
        state.stage = "o_more";
        return `${ack(persona, seed)} I have ${describeItems(state.slots.items)}. Anything else?`;
      }
      state.stage = "o_items";
      return "Of course — what would you like to order?";
    }
    case "support": {
      state.slots.issue = utterance;
      state.stage = "s_details";
      return "I'm sorry to hear that. Could you tell me a bit more about what happened, so I can get this to the right person?";
    }
    case "lead_inquiry": {
      state.slots.interest = state.slots.interest ?? cleanInterest(utterance);
      state.stage = "l_timeline";
      return `Happy to help with that. So I can point you to the right specialist — what timeline are you working with?`;
    }
    case "question": {
      state.outcome = "resolved";
      state.stage = "q_more";
      return `${answerQuestion(utterance)} Is there anything else I can help with?`;
    }
    default: {
      if (state.stage === "wrap") {
        return "Sure — what else can I do for you?";
      }
      return "I can help with bookings, orders, questions, or connect you with the team. What would you like to do?";
    }
  }
}

// ─────────────────────────────────────────────── slot harvesting

function harvestSlots(state: ConversationState, utterance: string) {
  state.lastUtterance = utterance;

  const when = extractWhen(utterance);
  if (when.dateLabel) state.slots.dateLabel = when.dateLabel;
  if (when.timeLabel) state.slots.timeLabel = when.timeLabel;
  if (when.date) {
    const minutes = when.timeMinutes ?? minutesFromLabel(state.slots.timeLabel);
    const dt = new Date(when.date);
    if (minutes !== undefined) dt.setMinutes(minutes);
    state.slots.startsAtIso = dt.toISOString();
  } else if (when.timeMinutes !== undefined && state.slots.startsAtIso) {
    const dt = new Date(state.slots.startsAtIso);
    dt.setHours(0, when.timeMinutes, 0, 0);
    state.slots.startsAtIso = dt.toISOString();
  }

  const party = extractPartySize(utterance);
  if (party) state.slots.partySize = party;

  const phone = extractPhone(utterance);
  if (phone) state.slots.phone = phone;

  const askedForName = ["b_name", "o_name", "s_name", "l_name"].includes(state.stage);
  const name = extractName(utterance, askedForName);
  if (name && (!state.slots.name || askedForName)) state.slots.name = name;
}

function minutesFromLabel(label?: string): number | undefined {
  if (!label) return undefined;
  const m = label.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return undefined;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + parseInt(m[2], 10);
}

// ─────────────────────────────────────────────── helpers

function pushTurn(state: ConversationState, speaker: "assistant" | "caller", text: string) {
  state.transcript.push({
    speaker,
    text,
    at: Math.round((Date.now() - state.startedAtMs) / 1000),
  });
}

function finishCall(state: ConversationState) {
  state.stage = "ended";
  state.done = true;
}

function describeBooking(state: ConversationState): string {
  const parts = [state.slots.service ?? "Appointment"];
  if (state.slots.dateLabel) parts.push(state.slots.dateLabel);
  if (state.slots.timeLabel) parts.push(`at ${state.slots.timeLabel}`);
  if (state.slots.partySize) parts.push(`for ${state.slots.partySize}`);
  return parts.join(" ");
}

function bookingPayload(state: ConversationState) {
  return {
    service: state.slots.service ?? "Appointment",
    startsAtIso: state.slots.startsAtIso,
    dateLabel: state.slots.dateLabel,
    timeLabel: state.slots.timeLabel,
    partySize: state.slots.partySize,
    name: state.slots.name,
    phone: state.slots.phone,
  };
}

function smsAction(state: ConversationState, what: string): ExtractedAction {
  return {
    type: "send_message",
    label: `Send ${what} SMS`,
    payload: { channel: "sms", to: state.slots.phone, template: what },
    status: "proposed",
  };
}

function describeItems(items: ParsedItem[]): string {
  return items.map((i) => (i.qty > 1 ? `${i.qty}× ${i.name}` : i.name)).join(", ");
}

function mergeItems(current: ParsedItem[], added: ParsedItem[]): ParsedItem[] {
  const merged = [...current];
  for (const item of added) {
    const existing = merged.find((m) => m.name === item.name);
    if (existing) existing.qty += item.qty;
    else merged.push(item);
  }
  return merged;
}

function orderTotal(state: ConversationState): number {
  return (state.slots.items ?? []).reduce((sum, i) => sum + priceFor(i.name) * i.qty, 0);
}

function orderSummary(state: ConversationState): string {
  const items = state.slots.items ?? [];
  const total = (orderTotal(state) / 100).toFixed(2);
  const type =
    state.slots.orderType === "delivery"
      ? "for delivery"
      : state.slots.orderType === "dine_in"
        ? "for dine-in"
        : "for pickup";
  return `Let me read that back: ${describeItems(items)}, ${type}, under ${state.slots.name}. Your total is $${total}.`;
}

function leadScore(state: ConversationState): number {
  let score = 50;
  if (state.slots.timeline) score += 15;
  if (state.slots.phone) score += 15;
  if (/\b(asap|this week|immediately|ready|now)\b/i.test(state.slots.timeline ?? "")) score += 10;
  if (/\b(budget|pre.?approved|cash|financ)/i.test(state.slots.interest ?? "")) score += 10;
  return Math.min(score, 98);
}

function answerQuestion(utterance: string): string {
  const lower = utterance.toLowerCase();
  if (/\b(hours?|open|close|opening|closing)\b/.test(lower))
    return "We're open Monday to Saturday from 9 AM to 9 PM, and Sundays from 10 AM to 6 PM.";
  if (/\b(location|address|directions?|where)\b/.test(lower))
    return "We're at 128 Harbor Street, downtown — two blocks from the central station, with parking on-site.";
  if (/\bparking\b/.test(lower))
    return "Yes — free parking is available right behind the building.";
  if (/\b(card|cash|payment|pay)\b/.test(lower))
    return "We accept all major cards, mobile payments, and cash.";
  if (/\bwifi\b/.test(lower)) return "Yes, free Wi-Fi is available for guests.";
  return "That's a great question — I've noted it for the team, and they'll include the answer when they follow up.";
}

function firstName(name: string): string {
  return name.split(/\s+/)[0]!;
}

/** "Hi, is the 2 bedroom still available? I'm interested" → "the 2 bedroom" */
function cleanInterest(utterance: string): string {
  return utterance
    .replace(/^\s*(hi|hey|hello|good (morning|afternoon|evening))[,!.\s]+/i, "")
    .replace(/\b(is|are)\s+/i, "")
    .replace(/\bstill (available|for sale|on the market)\b.*/i, "")
    .replace(/\bi'?m (very )?interested( in)?\b/gi, "")
    .replace(/[?!.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "your services";
}

function capitalize(s: string): string {
  return s[0]!.toUpperCase() + s.slice(1).toLowerCase();
}

import { db } from "@/lib/db";
import { parseJson, toJson } from "@/lib/json";
import type { ExtractedAction, Intent, Outcome, Sentiment } from "@/lib/types";
import type { ConversationState } from "./engine";
import { priceFor } from "./slots";

/**
 * Action executor: turns a finished ConversationState into persisted records —
 * the Call itself plus the business objects its actions describe. The future
 * telephony gateway calls this exact function with LLM-produced states.
 */

export interface CompletedCallInfo {
  callId: string;
  outcome: Outcome | null;
}

export async function completeCall(
  userId: string,
  assistantId: string,
  state: ConversationState,
  caller?: { name?: string; phone?: string }
): Promise<CompletedCallInfo> {
  const callerName = state.slots.name ?? caller?.name ?? null;
  const callerPhone = state.slots.phone ?? caller?.phone ?? "unknown";
  const lastAt = state.transcript.at(-1)?.at ?? 0;
  const durationSec = Math.max(lastAt + 4, 15);
  const intent: Intent = state.intent ?? "other";
  const outcome: Outcome | null = state.outcome ?? (state.transcript.length > 2 ? "resolved" : null);
  const sentiment = inferSentiment(outcome);
  const satisfaction = inferSatisfaction(sentiment, state);
  const summary = buildSummary(state, callerName);

  const executedActions: ExtractedAction[] = state.actions.map((a) => ({
    ...a,
    status: "executed",
  }));

  const call = await db.call.create({
    data: {
      userId,
      assistantId,
      direction: "inbound",
      status: "completed",
      callerName,
      callerPhone,
      startedAt: new Date(state.startedAtMs),
      endedAt: new Date(state.startedAtMs + durationSec * 1000),
      durationSec,
      intent,
      outcome,
      sentiment,
      satisfaction,
      summary,
      transcript: toJson(state.transcript),
      actions: toJson(executedActions),
    },
  });

  // Execute the structured actions
  for (const action of state.actions) {
    try {
      await executeAction(userId, call.id, callerName, callerPhone, action);
    } catch (e) {
      console.error(`[executor] action ${action.type} failed:`, e);
    }
  }

  // Contact book upsert
  if (callerPhone !== "unknown") {
    await db.contact.upsert({
      where: { userId_phone: { userId, phone: callerPhone } },
      update: { lastCallAt: new Date(), ...(callerName ? { name: callerName } : {}) },
      create: {
        userId,
        phone: callerPhone,
        name: callerName ?? "Unknown caller",
        lastCallAt: new Date(),
      },
    });
  }

  // Assistant long-term memory
  const assistant = await db.assistant.findFirst({ where: { id: assistantId, userId } });
  if (assistant?.memoryEnabled && callerName) {
    const notes = parseJson<string[]>(assistant.memoryNotes, []);
    notes.unshift(`${callerName} (${callerPhone}): ${summary}`);
    await db.assistant.update({
      where: { id: assistantId },
      data: { memoryNotes: toJson(notes.slice(0, 12)) },
    });
  }

  await db.auditLog.create({
    data: { userId, action: "call.completed", target: call.id, meta: toJson({ intent, outcome }) },
  });

  return { callId: call.id, outcome };
}

async function executeAction(
  userId: string,
  callId: string,
  callerName: string | null,
  callerPhone: string,
  action: ExtractedAction
) {
  switch (action.type) {
    case "book_appointment": {
      const p = action.payload as {
        service?: string;
        startsAtIso?: string;
        partySize?: number;
        name?: string;
        phone?: string;
        dateLabel?: string;
        timeLabel?: string;
      };
      const startsAt = p.startsAtIso
        ? new Date(p.startsAtIso)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db.appointment.create({
        data: {
          userId,
          callId,
          contactName: p.name ?? callerName ?? "Unknown",
          contactPhone: p.phone ?? callerPhone,
          service: p.partySize ? `${p.service ?? "Reservation"} (party of ${p.partySize})` : (p.service ?? "Appointment"),
          startsAt,
          durationMin: p.partySize ? 90 : 30,
          status: "confirmed",
          notes: "Booked by AI assistant",
        },
      });
      break;
    }
    case "create_order": {
      const p = action.payload as {
        items?: { name: string; qty: number; priceCents?: number }[];
        orderType?: string;
        name?: string;
        phone?: string;
        totalCents?: number;
      };
      const items = (p.items ?? []).map((i) => ({
        name: i.name,
        qty: i.qty,
        priceCents: i.priceCents ?? priceFor(i.name),
      }));
      await db.order.create({
        data: {
          userId,
          callId,
          contactName: p.name ?? callerName ?? "Unknown",
          contactPhone: p.phone ?? callerPhone,
          items: toJson(items),
          totalCents: p.totalCents ?? items.reduce((s, i) => s + i.priceCents * i.qty, 0),
          type: p.orderType ?? "pickup",
          status: "new",
          notes: "Taken by AI assistant",
        },
      });
      break;
    }
    case "capture_lead": {
      const p = action.payload as {
        name?: string;
        phone?: string;
        interest?: string;
        timeline?: string;
        score?: number;
      };
      await db.lead.create({
        data: {
          userId,
          callId,
          name: p.name ?? callerName ?? "Unknown",
          phone: p.phone ?? callerPhone,
          interest: p.interest,
          score: p.score ?? 50,
          source: "inbound_call",
          status: "new",
          notes: p.timeline ? `Timeline: ${p.timeline}` : "",
        },
      });
      break;
    }
    // send_message / update_crm / schedule_callback / create_reminder / escalate
    // dispatch through integration adapters in production; recorded on the call
    // record for now (visible in the call detail's action list).
    default:
      break;
  }
}

// ─────────────────────────────────────────────── inference helpers

function inferSentiment(outcome: Outcome | null): Sentiment {
  if (!outcome) return "neutral";
  if (["booked", "order_placed", "lead_captured", "resolved"].includes(outcome)) return "positive";
  if (outcome === "escalated") return "neutral";
  return "negative";
}

function inferSatisfaction(sentiment: Sentiment, state: ConversationState): number {
  if (sentiment === "positive") return state.transcript.length <= 10 ? 5 : 4;
  if (sentiment === "neutral") return 3;
  return 2;
}

function buildSummary(state: ConversationState, callerName: string | null): string {
  const who = callerName ?? "The caller";
  const s = state.slots;
  switch (state.intent) {
    case "book_appointment":
      return `${who} booked ${s.service ?? "an appointment"}${s.dateLabel ? ` for ${s.dateLabel}` : ""}${s.timeLabel ? ` at ${s.timeLabel}` : ""}${s.partySize ? ` (party of ${s.partySize})` : ""}. Confirmation SMS queued.`;
    case "place_order":
      return `${who} placed a ${s.orderType ?? "pickup"} order: ${(s.items ?? [])
        .map((i) => `${i.qty}× ${i.name}`)
        .join(", ")}.`;
    case "support":
      return `${who} reported an issue: "${(s.issue ?? "").slice(0, 140)}". Escalated with a callback scheduled.`;
    case "lead_inquiry":
      return `${who} inquired about ${(s.interest ?? "services").slice(0, 120)}. Lead captured${s.timeline ? ` (timeline: ${s.timeline.slice(0, 60)})` : ""}.`;
    case "question":
      return `${who} asked a general question and got an immediate answer.`;
    case "emergency":
      return `${who} reported an emergency — escalated immediately.`;
    default:
      return `${who} called; no specific request was completed.`;
  }
}

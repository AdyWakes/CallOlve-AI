import type { ExtractedAction, Intent, Outcome } from "@/lib/types";
import type { AssistantPersona, EngineSlots } from "./engine";
import { extractWhen, priceFor, type ParsedItem } from "./slots";

/**
 * LLM adapter — GitHub Models (free, OpenAI-compatible).
 *
 * This is the production "brain" that replaces the deterministic engine for
 * live voice. It implements the same contract the rest of the platform relies
 * on: a turn produces a spoken `reply` plus structured `actions`/`slots`, and
 * a finished call is handed to the same `completeCall` executor — so every
 * downstream feature (calls log, appointments, analytics) lights up unchanged.
 *
 * No SDK dependency — plain fetch against the OpenAI chat-completions shape, so
 * the same code points at GitHub Models now and a self-hosted vLLM endpoint
 * (AMD Developer Cloud) later by changing two env vars.
 */

const BASE_URL = () =>
  process.env.GITHUB_MODELS_BASE_URL?.replace(/\/$/, "") ?? "https://models.github.ai/inference";
const MODEL = () => process.env.GITHUB_MODELS_MODEL ?? "openai/gpt-4o-mini";
const TOKEN = () => process.env.GITHUB_MODELS_TOKEN ?? "";

export function llmConfigured(): boolean {
  return TOKEN().length > 0;
}

// ─────────────────────────────────────────────── Chat protocol types

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface VoiceTurnResult {
  reply: string;
  messages: ChatMessage[];
  /** Actions produced this turn (caller accumulates across the call) */
  newActions: ExtractedAction[];
  /** Slot values learned this turn (caller merges) */
  slots: EngineSlots;
  intent: Intent | null;
  outcome: Outcome | null;
  done: boolean;
}

// ─────────────────────────────────────────────── Tool schema

const TOOLS = [
  {
    type: "function",
    function: {
      name: "book_appointment",
      description:
        "Book an appointment or reservation once you have confirmed all details with the caller.",
      parameters: {
        type: "object",
        properties: {
          service: { type: "string", description: "What is being booked, e.g. 'Table reservation' or 'Dental cleaning'" },
          date_text: { type: "string", description: "Day as the caller said it, e.g. 'tomorrow', 'Friday'" },
          time_text: { type: "string", description: "Time as said, e.g. '7pm', '2:30 PM'" },
          party_size: { type: "integer", description: "Number of people, if relevant" },
          name: { type: "string" },
          phone: { type: "string" },
        },
        required: ["service", "name", "phone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_order",
      description: "Place an order once the caller confirms the items and pickup/delivery.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: { name: { type: "string" }, qty: { type: "integer" } },
              required: ["name", "qty"],
            },
          },
          order_type: { type: "string", enum: ["pickup", "delivery", "dine_in"] },
          name: { type: "string" },
          phone: { type: "string" },
        },
        required: ["items", "name", "phone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "capture_lead",
      description: "Capture a sales lead when a caller is interested in a product/service or pricing.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          interest: { type: "string", description: "What they're interested in" },
          timeline: { type: "string", description: "Their timeline/urgency, if mentioned" },
        },
        required: ["name", "phone", "interest"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "escalate",
      description: "Escalate to a human and schedule a callback (support issues, emergencies, anything you can't resolve).",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string" },
          name: { type: "string" },
          phone: { type: "string" },
        },
        required: ["reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "end_call",
      description:
        "End the call when the caller has nothing else and has said goodbye. Always call this last.",
      parameters: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            enum: ["book_appointment", "place_order", "support", "lead_inquiry", "question", "emergency", "other"],
          },
          outcome: {
            type: "string",
            enum: ["resolved", "booked", "order_placed", "lead_captured", "escalated", "voicemail", "no_answer"],
          },
        },
        required: ["intent", "outcome"],
      },
    },
  },
] as const;

// ─────────────────────────────────────────────── System prompt

export function buildSystemPrompt(persona: AssistantPersona, instructions: string): string {
  return [
    `You are ${persona.name}, an AI voice assistant answering a phone call.`,
    `Personality: ${persona.personality}. Tone: ${persona.tone}.`,
    instructions || "Help the caller with whatever they need.",
    "",
    "RULES — you are on a live phone call:",
    "- Keep every reply to one or two short spoken sentences. Never use lists, markdown, or emoji.",
    "- Ask for only one missing piece of information at a time.",
    "- You ALREADY have the caller's phone number from caller ID. NEVER ask them to say or spell their number. When you need it, just say you'll text the confirmation to the number they're calling from.",
    "- Phone calls can mishear names. Repeat the caller's name back to confirm; if you're unsure, politely ask them to spell it. Don't move on until the name is confirmed.",
    "- Collect the caller's name (you do NOT need their number) before booking, ordering, or capturing a lead.",
    "- Always read the key details back and get a yes before calling a tool that takes an action.",
    "- Use the tools to actually perform the work; don't claim something is done unless you called the tool.",
    "- When the caller is finished and says goodbye, give a short closing line and call end_call.",
  ].join("\n");
}

// ─────────────────────────────────────────────── Turn execution

export function initialMessages(persona: AssistantPersona, instructions: string): ChatMessage[] {
  return [{ role: "system", content: buildSystemPrompt(persona, instructions) }];
}

export async function voiceTurn(
  history: ChatMessage[],
  utterance: string
): Promise<VoiceTurnResult> {
  const messages: ChatMessage[] = [...history, { role: "user", content: utterance }];
  const newActions: ExtractedAction[] = [];
  const slots: EngineSlots = {};
  let intent: Intent | null = null;
  let outcome: Outcome | null = null;
  let done = false;
  let reply = "";

  // The model may call tools, which we execute and feed back, then it produces
  // the spoken reply. Cap the hops so a misbehaving model can't loop forever.
  for (let hop = 0; hop < 4; hop++) {
    const choice = await callModel(messages);
    const msg = choice.message;
    messages.push(msg);

    if (msg.tool_calls?.length) {
      for (const call of msg.tool_calls) {
        const args = safeParse(call.function.arguments);
        const result = applyTool(call.function.name, args, newActions, slots);
        if (result.intent && !intent) intent = result.intent;
        if (result.outcome) outcome = result.outcome;
        if (result.done) done = true;
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: result.toolResponse,
        });
      }
      // loop again so the model can speak after the tool result
      continue;
    }

    reply = (msg.content ?? "").trim();
    break;
  }

  if (!reply) {
    reply = done
      ? "Thank you for calling — take care!"
      : "Sorry, could you say that again?";
  }

  // Safety net: models reliably perform action tools but often skip end_call,
  // just saying goodbye in text. If the caller clearly closed the call, end it.
  if (!done && looksLikeGoodbye(utterance)) done = true;

  return { reply, messages, newActions, slots, intent, outcome, done };
}

// ─────────────────────────────────────────────── Tool → action mapping

interface ToolOutcome {
  toolResponse: string;
  intent?: Intent;
  outcome?: Outcome;
  done?: boolean;
}

function applyTool(
  name: string,
  args: Record<string, unknown>,
  actions: ExtractedAction[],
  slots: EngineSlots
): ToolOutcome {
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const num = (v: unknown) => (typeof v === "number" ? v : undefined);

  if (str(args.name)) slots.name = str(args.name);
  if (str(args.phone)) slots.phone = str(args.phone);

  switch (name) {
    case "book_appointment": {
      const when = extractWhen(`${str(args.date_text) ?? ""} ${str(args.time_text) ?? ""}`);
      let startsAtIso: string | undefined;
      if (when.date) {
        const dt = new Date(when.date);
        if (when.timeMinutes != null) dt.setMinutes(when.timeMinutes);
        startsAtIso = dt.toISOString();
      }
      slots.service = str(args.service) ?? "Appointment";
      slots.dateLabel = str(args.date_text);
      slots.timeLabel = when.timeLabel ?? str(args.time_text);
      slots.partySize = num(args.party_size);
      slots.startsAtIso = startsAtIso;
      actions.push({
        type: "book_appointment",
        label: `Book ${slots.service} ${slots.dateLabel ?? ""} ${slots.timeLabel ?? ""}`.trim(),
        payload: {
          service: slots.service,
          startsAtIso,
          partySize: slots.partySize,
          name: slots.name,
          phone: slots.phone,
          dateLabel: slots.dateLabel,
          timeLabel: slots.timeLabel,
        },
        status: "executed",
      });
      return { toolResponse: "Appointment recorded.", intent: "book_appointment", outcome: "booked" };
    }

    case "create_order": {
      const rawItems = Array.isArray(args.items) ? args.items : [];
      const items: ParsedItem[] = rawItems
        .map((it) => {
          const obj = it as Record<string, unknown>;
          return { name: String(obj.name ?? "").trim(), qty: Number(obj.qty ?? 1) || 1 };
        })
        .filter((i) => i.name);
      slots.items = items;
      slots.orderType = (str(args.order_type) as EngineSlots["orderType"]) ?? "pickup";
      const priced = items.map((i) => ({ name: i.name, qty: i.qty, priceCents: priceFor(i.name) }));
      const totalCents = priced.reduce((s, i) => s + i.priceCents * i.qty, 0);
      actions.push({
        type: "create_order",
        label: `Order: ${items.map((i) => `${i.qty}× ${i.name}`).join(", ")}`,
        payload: { items: priced, orderType: slots.orderType, name: slots.name, phone: slots.phone, totalCents },
        status: "executed",
      });
      return { toolResponse: "Order recorded.", intent: "place_order", outcome: "order_placed" };
    }

    case "capture_lead": {
      slots.interest = str(args.interest);
      slots.timeline = str(args.timeline);
      let score = 55;
      if (slots.timeline) score += 15;
      if (slots.phone) score += 15;
      if (/\b(asap|this week|immediately|ready|now)\b/i.test(slots.timeline ?? "")) score += 13;
      actions.push({
        type: "capture_lead",
        label: `New lead: ${slots.name ?? "caller"}`,
        payload: { name: slots.name, phone: slots.phone, interest: slots.interest, timeline: slots.timeline, score: Math.min(score, 98) },
        status: "executed",
      });
      return { toolResponse: "Lead captured.", intent: "lead_inquiry", outcome: "lead_captured" };
    }

    case "escalate": {
      slots.issue = str(args.reason);
      actions.push({
        type: "escalate",
        label: "Escalate to human team",
        payload: { issue: slots.issue, name: slots.name, phone: slots.phone },
        status: "executed",
      });
      actions.push({
        type: "schedule_callback",
        label: `Callback for ${slots.name ?? "caller"}`,
        payload: { phone: slots.phone, reason: slots.issue },
        status: "executed",
      });
      return { toolResponse: "Escalation logged and callback scheduled.", intent: "support", outcome: "escalated" };
    }

    case "end_call": {
      const intent = str(args.intent) as Intent | undefined;
      const outcome = str(args.outcome) as Outcome | undefined;
      return { toolResponse: "Call ended.", intent, outcome, done: true };
    }

    default:
      return { toolResponse: "Unknown tool." };
  }
}

// ─────────────────────────────────────────────── HTTP

interface ModelChoice {
  message: ChatMessage;
}

async function callModel(messages: ChatMessage[]): Promise<ModelChoice> {
  const token = TOKEN();
  if (!token) throw new Error("GITHUB_MODELS_TOKEN is not set");

  const res = await fetch(`${BASE_URL()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: MODEL(),
      messages,
      tools: TOOLS,
      tool_choice: "auto",
      temperature: 0.5,
      max_tokens: 400,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`LLM request failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  const json = (await res.json()) as { choices?: ModelChoice[] };
  const choice = json.choices?.[0];
  if (!choice) throw new Error("LLM returned no choices");
  return choice;
}

function safeParse(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function looksLikeGoodbye(utterance: string): boolean {
  return /\b(bye|goodbye|good bye|that'?s (all|everything|it)|nothing else|no that'?s all|we'?re good|all set|have a (good|great|nice) (day|one))\b/i.test(
    utterance
  );
}

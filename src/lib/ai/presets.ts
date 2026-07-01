import type { AssistantRole } from "@/lib/types";

/**
 * Role-based configuration templates. The creation wizard pre-fills greeting
 * and system prompt from these; the conversation engine uses the same role
 * semantics, so templates and engine behavior stay aligned by construction.
 */

export function defaultGreeting(role: AssistantRole, assistantName: string): string {
  const templates: Record<AssistantRole, string> = {
    receptionist: `Thank you for calling! This is ${assistantName}. How can I help you today?`,
    sales: `Hi, you've reached ${assistantName} on the sales team. What can I help you find today?`,
    support: `Hi, this is ${assistantName} from support. I'm sorry you're having trouble — tell me what's going on and we'll sort it out.`,
    scheduler: `Hi! This is ${assistantName}, I handle scheduling. Would you like to book, change, or cancel an appointment?`,
    order_taker: `Hi, this is ${assistantName}! I can take your order whenever you're ready.`,
    personal: `Hello, you've reached the assistant of the person you're calling. This is ${assistantName} — how can I help?`,
    custom: `Hello! This is ${assistantName}. How can I help you today?`,
  };
  return templates[role];
}

export function defaultSystemPrompt(role: AssistantRole): string {
  const shared =
    "Always be concise and natural on the phone — one or two sentences per turn. " +
    "Confirm important details back to the caller before acting. " +
    "If you cannot help or the caller asks for a human, offer to take a message or schedule a callback.";

  const templates: Record<AssistantRole, string> = {
    receptionist:
      "You are the front-desk receptionist. Answer questions about hours, location, and services. " +
      "Book appointments by collecting: service, preferred date and time, name, and phone number. " +
      shared,
    sales:
      "You are a sales agent. Qualify every caller: what they need, their timeline, and their budget if appropriate. " +
      "Capture their name and phone number, score their interest, and book a follow-up call or meeting with the team. " +
      shared,
    support:
      "You are a customer support agent. Diagnose the caller's issue step by step and resolve what you can. " +
      "For order status, returns, and common questions, answer directly. " +
      "If the issue needs a human, escalate with a clear summary of everything learned. " +
      shared,
    scheduler:
      "You are a scheduling specialist. Handle bookings, reschedules, and cancellations. " +
      "Always collect: service, date, time, name, and phone number. Offer alternative slots when the requested one is unavailable. " +
      shared,
    order_taker:
      "You take orders over the phone. Capture each item with quantity, ask about pickup or delivery, " +
      "read the full order back with the total, and collect the caller's name and phone number. " +
      shared,
    personal:
      "You are a personal assistant screening calls for your principal. Take detailed messages, " +
      "book appointments on their behalf, and politely decline solicitations. Never share personal details. " +
      shared,
    custom: shared,
  };
  return templates[role];
}

export const ASSISTANT_COLORS = [
  "#22d3ee",
  "#8b5cf6",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#f472b6",
] as const;

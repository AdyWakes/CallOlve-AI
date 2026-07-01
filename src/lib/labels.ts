import type { BadgeVariant } from "@/components/ui/badge";
import type {
  AppointmentStatus,
  AssistantRole,
  AssistantStatus,
  CallDirection,
  CallStatus,
  Intent,
  LeadStatus,
  OrderStatus,
  OrderType,
  Outcome,
  Personality,
  Sentiment,
  SosStatus,
  SosTrigger,
  Tone,
  Voice,
} from "./types";

/**
 * Display metadata for every domain enum: human label + badge color.
 * UI never hand-rolls status colors — it reads them from here.
 */

export interface StatusMeta {
  label: string;
  variant: BadgeVariant;
}

export const CALL_STATUS_META: Record<CallStatus, StatusMeta> = {
  active: { label: "Live", variant: "ok" },
  completed: { label: "Completed", variant: "ok" },
  missed: { label: "Missed", variant: "bad" },
  scheduled: { label: "Scheduled", variant: "violet" },
  failed: { label: "Failed", variant: "bad" },
};

export const DIRECTION_META: Record<CallDirection, StatusMeta> = {
  inbound: { label: "Inbound", variant: "brand" },
  outbound: { label: "Outbound", variant: "violet" },
};

export const INTENT_META: Record<Intent, StatusMeta> = {
  book_appointment: { label: "Appointment", variant: "brand" },
  place_order: { label: "Order", variant: "violet" },
  support: { label: "Support", variant: "warn" },
  lead_inquiry: { label: "Lead inquiry", variant: "ok" },
  question: { label: "Question", variant: "default" },
  emergency: { label: "Emergency", variant: "bad" },
  other: { label: "Other", variant: "default" },
};

export const OUTCOME_META: Record<Outcome, StatusMeta> = {
  resolved: { label: "Resolved", variant: "ok" },
  booked: { label: "Booked", variant: "brand" },
  order_placed: { label: "Order placed", variant: "violet" },
  lead_captured: { label: "Lead captured", variant: "ok" },
  escalated: { label: "Escalated", variant: "warn" },
  voicemail: { label: "Voicemail", variant: "default" },
  no_answer: { label: "No answer", variant: "bad" },
};

export const SENTIMENT_META: Record<Sentiment, StatusMeta> = {
  positive: { label: "Positive", variant: "ok" },
  neutral: { label: "Neutral", variant: "default" },
  negative: { label: "Negative", variant: "bad" },
};

export const ASSISTANT_STATUS_META: Record<AssistantStatus, StatusMeta> = {
  active: { label: "Active", variant: "ok" },
  paused: { label: "Paused", variant: "warn" },
  draft: { label: "Draft", variant: "default" },
};

export const APPOINTMENT_STATUS_META: Record<AppointmentStatus, StatusMeta> = {
  pending: { label: "Pending", variant: "warn" },
  confirmed: { label: "Confirmed", variant: "brand" },
  completed: { label: "Completed", variant: "ok" },
  cancelled: { label: "Cancelled", variant: "default" },
  no_show: { label: "No-show", variant: "bad" },
};

export const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  new: { label: "New", variant: "brand" },
  preparing: { label: "Preparing", variant: "warn" },
  ready: { label: "Ready", variant: "violet" },
  fulfilled: { label: "Fulfilled", variant: "ok" },
  cancelled: { label: "Cancelled", variant: "default" },
};

export const ORDER_TYPE_META: Record<OrderType, string> = {
  pickup: "Pickup",
  delivery: "Delivery",
  dine_in: "Dine-in",
};

export const LEAD_STATUS_META: Record<LeadStatus, StatusMeta> = {
  new: { label: "New", variant: "brand" },
  qualified: { label: "Qualified", variant: "violet" },
  contacted: { label: "Contacted", variant: "warn" },
  converted: { label: "Converted", variant: "ok" },
  lost: { label: "Lost", variant: "default" },
};

export const SOS_STATUS_META: Record<SosStatus, StatusMeta> = {
  active: { label: "ACTIVE", variant: "bad" },
  resolved: { label: "Resolved", variant: "ok" },
  cancelled: { label: "Cancelled", variant: "default" },
  false_alarm: { label: "False alarm", variant: "warn" },
};

export const SOS_TRIGGER_META: Record<SosTrigger, string> = {
  power_button: "Power button (triple press)",
  wearable: "Wearable device",
  voice: "Voice activation",
  app: "Mobile app",
  manual: "Manual (dashboard)",
};

// ─────────────────────────────────────────────── Assistant configuration

export const ROLE_META: Record<AssistantRole, { label: string; description: string }> = {
  receptionist: {
    label: "Receptionist",
    description: "Answers every call, books appointments, routes questions.",
  },
  sales: {
    label: "Sales agent",
    description: "Qualifies leads, captures budgets and timelines, books follow-ups.",
  },
  support: {
    label: "Support agent",
    description: "Resolves common issues, files detailed tickets, escalates cleanly.",
  },
  scheduler: {
    label: "Scheduler",
    description: "Dedicated booking specialist: availability, changes, reminders.",
  },
  order_taker: {
    label: "Order taker",
    description: "Takes orders item by item with totals, pickup or delivery.",
  },
  personal: {
    label: "Personal assistant",
    description: "Your private line: screens calls, takes messages, runs errands by phone.",
  },
  custom: {
    label: "Custom",
    description: "Start from a blank prompt and define any behavior you need.",
  },
};

export const PERSONALITY_META: Record<Personality, { label: string; description: string }> = {
  professional: { label: "Professional", description: "Polished, precise, businesslike." },
  friendly: { label: "Friendly", description: "Warm and approachable, like a great host." },
  energetic: { label: "Energetic", description: "Upbeat and enthusiastic, keeps momentum." },
  calm: { label: "Calm", description: "Steady and reassuring, never rushed." },
  witty: { label: "Witty", description: "Light, clever charm — tasteful, never silly." },
};

export const TONE_META: Record<Tone, { label: string; description: string }> = {
  formal: { label: "Formal", description: "Sir/Madam territory. Hotels, law, medicine." },
  casual: { label: "Casual", description: "Relaxed and conversational." },
  warm: { label: "Warm", description: "Personable with genuine empathy." },
  direct: { label: "Direct", description: "Efficient and to the point." },
};

export const VOICE_META: Record<Voice, { label: string; description: string }> = {
  nova: { label: "Nova", description: "Clear, bright female voice — flagship receptionist." },
  atlas: { label: "Atlas", description: "Confident male voice with executive presence." },
  luna: { label: "Luna", description: "Soft, soothing female voice — clinics & wellness." },
  orion: { label: "Orion", description: "Deep, warm male voice — hospitality grade." },
  sage: { label: "Sage", description: "Neutral, articulate voice — support specialist." },
  aria: { label: "Aria", description: "Expressive female voice — sales & engagement." },
};

export const LANGUAGE_META: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  hi: "Hindi",
  pt: "Portuguese",
};

export const RELATIONSHIP_META: Record<string, string> = {
  family: "Family",
  friend: "Friend",
  colleague: "Colleague",
  doctor: "Doctor",
  other: "Other",
};

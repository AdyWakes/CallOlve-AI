import { z } from "zod";

/**
 * Domain vocabulary — the single source of truth for every "enum-as-string"
 * column in prisma/schema.prisma. API validation (Zod), services, and UI
 * option lists all import from here so values can never drift.
 */

// ─────────────────────────────────────────────── Assistants

export const ASSISTANT_ROLES = [
  "receptionist",
  "sales",
  "support",
  "scheduler",
  "order_taker",
  "personal",
  "custom",
] as const;
export type AssistantRole = (typeof ASSISTANT_ROLES)[number];

export const PERSONALITIES = [
  "professional",
  "friendly",
  "energetic",
  "calm",
  "witty",
] as const;
export type Personality = (typeof PERSONALITIES)[number];

export const TONES = ["formal", "casual", "warm", "direct"] as const;
export type Tone = (typeof TONES)[number];

export const VOICES = ["nova", "atlas", "luna", "orion", "sage", "aria"] as const;
export type Voice = (typeof VOICES)[number];

export const LANGUAGES = ["en", "es", "fr", "de", "hi", "pt"] as const;

export const ASSISTANT_STATUSES = ["active", "paused", "draft"] as const;
export type AssistantStatus = (typeof ASSISTANT_STATUSES)[number];

// ─────────────────────────────────────────────── Calls

export const CALL_DIRECTIONS = ["inbound", "outbound"] as const;
export type CallDirection = (typeof CALL_DIRECTIONS)[number];

export const CALL_STATUSES = [
  "active",
  "completed",
  "missed",
  "scheduled",
  "failed",
] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

export const INTENTS = [
  "book_appointment",
  "place_order",
  "support",
  "lead_inquiry",
  "question",
  "emergency",
  "other",
] as const;
export type Intent = (typeof INTENTS)[number];

export const OUTCOMES = [
  "resolved",
  "booked",
  "order_placed",
  "lead_captured",
  "escalated",
  "voicemail",
  "no_answer",
] as const;
export type Outcome = (typeof OUTCOMES)[number];

export const SENTIMENTS = ["positive", "neutral", "negative"] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export interface TranscriptTurn {
  speaker: "assistant" | "caller";
  text: string;
  /** Seconds from call start */
  at: number;
}

export const ACTION_TYPES = [
  "book_appointment",
  "create_order",
  "capture_lead",
  "schedule_callback",
  "send_message",
  "create_reminder",
  "update_crm",
  "escalate",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export interface ExtractedAction {
  type: ActionType;
  label: string;
  payload: Record<string, unknown>;
  status: "proposed" | "executed" | "failed";
}

// ─────────────────────────────────────────────── Automation

export const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/** Allowed forward transitions per status (UI and API both enforce). */
export const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled", "no_show"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export const ORDER_STATUSES = [
  "new",
  "preparing",
  "ready",
  "fulfilled",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["fulfilled", "cancelled"],
  fulfilled: [],
  cancelled: [],
};

export const ORDER_TYPES = ["pickup", "delivery", "dine_in"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export interface OrderItem {
  name: string;
  qty: number;
  priceCents: number;
}

export const LEAD_STATUSES = [
  "new",
  "qualified",
  "contacted",
  "converted",
  "lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ["qualified", "contacted", "lost"],
  qualified: ["contacted", "converted", "lost"],
  contacted: ["qualified", "converted", "lost"],
  converted: [],
  lost: ["new"],
};

// ─────────────────────────────────────────────── Integrations

export const INTEGRATION_CATEGORIES = ["crm", "calendar", "messaging"] as const;
export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

export const INTEGRATION_PROVIDERS = [
  "hubspot",
  "salesforce",
  "zoho",
  "custom_api",
  "google_calendar",
  "outlook_calendar",
  "apple_calendar",
  "whatsapp",
  "instagram",
  "telegram",
  "sms",
  "email",
] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

// ─────────────────────────────────────────────── Zod request schemas

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  company: z.string().trim().max(80).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(24).optional(),
  timezone: z.string().trim().max(64).optional(),
  language: z.enum(LANGUAGES).optional(),
});

export const assistantCreateSchema = z.object({
  name: z.string().trim().min(2, "Give your assistant a name").max(60),
  role: z.enum(ASSISTANT_ROLES),
  personality: z.enum(PERSONALITIES),
  tone: z.enum(TONES),
  voice: z.enum(VOICES),
  language: z.enum(LANGUAGES).default("en"),
  greeting: z.string().trim().max(300).default(""),
  systemPrompt: z.string().trim().max(4000).default(""),
  memoryEnabled: z.boolean().default(true),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#22d3ee"),
});

export const assistantUpdateSchema = assistantCreateSchema.partial().extend({
  status: z.enum(ASSISTANT_STATUSES).optional(),
  memoryNotes: z.array(z.string().max(500)).max(50).optional(),
});

export const transcriptTurnSchema = z.object({
  speaker: z.enum(["assistant", "caller"]),
  text: z.string().max(2000),
  at: z.number().min(0),
});

export const extractedActionSchema = z.object({
  type: z.enum(ACTION_TYPES),
  label: z.string().max(200),
  payload: z.record(z.string(), z.unknown()),
  status: z.enum(["proposed", "executed", "failed"]),
});

export const callCreateSchema = z.object({
  assistantId: z.string().optional(),
  direction: z.enum(CALL_DIRECTIONS).default("inbound"),
  status: z.enum(CALL_STATUSES).default("completed"),
  callerName: z.string().trim().max(80).optional(),
  callerPhone: z.string().trim().min(3).max(24),
  durationSec: z.number().int().min(0).default(0),
  intent: z.enum(INTENTS).optional(),
  outcome: z.enum(OUTCOMES).optional(),
  sentiment: z.enum(SENTIMENTS).optional(),
  satisfaction: z.number().int().min(1).max(5).optional(),
  summary: z.string().max(2000).optional(),
  transcript: z.array(transcriptTurnSchema).default([]),
  actions: z.array(extractedActionSchema).default([]),
  scheduledFor: z.coerce.date().optional(),
});

export const appointmentCreateSchema = z.object({
  contactName: z.string().trim().min(1).max(80),
  contactPhone: z.string().trim().min(3).max(24),
  service: z.string().trim().min(1).max(120),
  startsAt: z.coerce.date(),
  durationMin: z.number().int().min(5).max(480).default(30),
  status: z.enum(APPOINTMENT_STATUSES).default("confirmed"),
  location: z.string().trim().max(160).optional(),
  notes: z.string().max(1000).default(""),
});

export const appointmentUpdateSchema = appointmentCreateSchema.partial();

export const orderItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  qty: z.number().int().min(1).max(99),
  priceCents: z.number().int().min(0),
});

export const orderCreateSchema = z.object({
  contactName: z.string().trim().min(1).max(80),
  contactPhone: z.string().trim().min(3).max(24),
  items: z.array(orderItemSchema).min(1),
  type: z.enum(ORDER_TYPES).default("pickup"),
  status: z.enum(ORDER_STATUSES).default("new"),
  notes: z.string().max(1000).default(""),
});

export const orderUpdateSchema = orderCreateSchema.partial();

export const leadCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(3).max(24),
  email: z.string().trim().email().optional().or(z.literal("")),
  interest: z.string().trim().max(200).optional(),
  source: z.string().trim().max(60).default("manual"),
  score: z.number().int().min(0).max(100).default(50),
  status: z.enum(LEAD_STATUSES).default("new"),
  notes: z.string().max(1000).default(""),
});

export const leadUpdateSchema = leadCreateSchema.partial();

export const integrationConnectSchema = z.object({
  provider: z.enum(INTEGRATION_PROVIDERS),
});

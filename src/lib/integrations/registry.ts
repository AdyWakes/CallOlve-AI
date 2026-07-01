import type { ProviderInfo } from "./types";

/** The catalog of supported providers, grouped by category in the UI. */
export const PROVIDER_REGISTRY: ProviderInfo[] = [
  // ── CRM
  {
    id: "hubspot",
    name: "HubSpot",
    category: "crm",
    description: "Sync contacts, log calls as activities, and create deals from qualified leads.",
    unlocks: ["Contact sync", "Call activity logging", "Deal creation from leads"],
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "crm",
    description: "Push leads and call outcomes straight into your Salesforce pipeline.",
    unlocks: ["Lead sync", "Opportunity creation", "Task logging"],
  },
  {
    id: "zoho",
    name: "Zoho CRM",
    category: "crm",
    description: "Keep Zoho contacts and deals updated from every AI conversation.",
    unlocks: ["Contact sync", "Deal updates", "Call notes"],
  },
  {
    id: "custom_api",
    name: "Custom API",
    category: "crm",
    description: "Send structured call events to any endpoint you own via signed webhooks.",
    unlocks: ["Webhook delivery", "Custom payload mapping", "HMAC signatures"],
  },
  // ── Calendar
  {
    id: "google_calendar",
    name: "Google Calendar",
    category: "calendar",
    description: "The AI checks real availability before booking and syncs every appointment.",
    unlocks: ["Availability lookup", "Two-way event sync", "Reschedule handling"],
  },
  {
    id: "outlook_calendar",
    name: "Outlook Calendar",
    category: "calendar",
    description: "Microsoft 365 calendar sync for bookings, changes, and cancellations.",
    unlocks: ["Availability lookup", "Event creation", "Meeting invites"],
  },
  {
    id: "apple_calendar",
    name: "Apple Calendar",
    category: "calendar",
    description: "iCloud calendar sync via CalDAV for personal-assistant workflows.",
    unlocks: ["Event sync", "Reminder creation"],
  },
  // ── Messaging
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    category: "messaging",
    description: "Booking confirmations, order updates, and follow-ups on WhatsApp.",
    unlocks: ["Confirmation messages", "Follow-up sequences", "Inbound message capture"],
  },
  {
    id: "instagram",
    name: "Instagram DM",
    category: "messaging",
    description: "Answer Instagram DMs with the same assistant that answers your phone.",
    unlocks: ["DM auto-replies", "Lead capture from DMs"],
  },
  {
    id: "telegram",
    name: "Telegram",
    category: "messaging",
    description: "Telegram bot channel for notifications and two-way conversations.",
    unlocks: ["Bot conversations", "Instant notifications"],
  },
  {
    id: "sms",
    name: "SMS (Twilio)",
    category: "messaging",
    description: "Text confirmations, reminders, and missed-call follow-ups.",
    unlocks: ["SMS confirmations", "Reminder texts", "Missed-call textback"],
  },
  {
    id: "email",
    name: "Email",
    category: "messaging",
    description: "Call summaries and confirmations delivered to inboxes.",
    unlocks: ["Daily digest", "Per-call summaries", "Confirmation emails"],
  },
];

export const CATEGORY_LABELS: Record<string, { title: string; blurb: string }> = {
  crm: {
    title: "CRM",
    blurb: "Where your AI's captured leads, contacts, and call notes land.",
  },
  calendar: {
    title: "Calendars",
    blurb: "Real availability for booking — no double-booked tables or rooms.",
  },
  messaging: {
    title: "Messaging",
    blurb: "Confirmations and follow-ups on the channels your customers actually read.",
  },
};

import type { IntegrationCategory, IntegrationProvider } from "@/lib/types";

/**
 * Integration adapter contracts. Every external system CallOlve talks to is
 * behind one of these three interfaces. The action executor and follow-up
 * workers call adapters — never provider SDKs directly — so adding a provider
 * means writing one adapter file and one registry entry.
 */

export interface AdapterContext {
  userId: string;
  /** Decrypted provider config from the Integration row */
  config: Record<string, unknown>;
}

export interface AdapterResult {
  ok: boolean;
  /** Provider-side id of the created/updated object, when applicable */
  externalId?: string;
  error?: string;
}

// ── CRM (HubSpot, Salesforce, Zoho, custom API)

export interface CrmContact {
  name: string;
  phone: string;
  email?: string;
  company?: string;
}

export interface CrmDeal {
  contactPhone: string;
  title: string;
  value?: number;
  stage?: string;
  notes?: string;
}

export interface CrmAdapter {
  provider: IntegrationProvider;
  upsertContact(ctx: AdapterContext, contact: CrmContact): Promise<AdapterResult>;
  createDeal(ctx: AdapterContext, deal: CrmDeal): Promise<AdapterResult>;
  logActivity(
    ctx: AdapterContext,
    activity: { contactPhone: string; type: "call" | "note"; summary: string }
  ): Promise<AdapterResult>;
}

// ── Calendar (Google, Outlook, Apple)

export interface CalendarSlot {
  startsAt: Date;
  endsAt: Date;
}

export interface CalendarAdapter {
  provider: IntegrationProvider;
  /** Free slots within a window — used by the engine before offering times */
  findAvailability(
    ctx: AdapterContext,
    window: { from: Date; to: Date; durationMin: number }
  ): Promise<CalendarSlot[]>;
  createEvent(
    ctx: AdapterContext,
    event: { title: string; startsAt: Date; durationMin: number; description?: string }
  ): Promise<AdapterResult>;
  cancelEvent(ctx: AdapterContext, externalId: string): Promise<AdapterResult>;
}

// ── Messaging (WhatsApp, Instagram, Telegram, SMS, Email)

export interface OutboundMessage {
  to: string;
  body: string;
  /** Template id for channels that require pre-approved templates (WhatsApp) */
  templateId?: string;
}

export interface MessagingAdapter {
  provider: IntegrationProvider;
  send(ctx: AdapterContext, message: OutboundMessage): Promise<AdapterResult>;
}

export type AnyAdapter = CrmAdapter | CalendarAdapter | MessagingAdapter;

export interface ProviderInfo {
  id: IntegrationProvider;
  name: string;
  category: IntegrationCategory;
  description: string;
  /** What AI actions light up once connected */
  unlocks: string[];
}

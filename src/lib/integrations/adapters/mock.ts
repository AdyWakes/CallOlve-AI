import type { IntegrationProvider } from "@/lib/types";
import type {
  AdapterContext,
  AdapterResult,
  CalendarAdapter,
  CalendarSlot,
  CrmAdapter,
  MessagingAdapter,
  OutboundMessage,
} from "../types";

/**
 * Mock adapters: deterministic, no network, used in local/dev mode for every
 * provider. Production builds register real adapters per provider behind the
 * same interfaces (see docs/ARCHITECTURE.md §2 — adapter pattern).
 */

function success(prefix: string): AdapterResult {
  return { ok: true, externalId: `${prefix}_${Math.random().toString(36).slice(2, 10)}` };
}

export function mockCrmAdapter(provider: IntegrationProvider): CrmAdapter {
  return {
    provider,
    async upsertContact(_ctx: AdapterContext, contact) {
      console.log(`[mock:${provider}] upsertContact`, contact.name, contact.phone);
      return success("contact");
    },
    async createDeal(_ctx: AdapterContext, deal) {
      console.log(`[mock:${provider}] createDeal`, deal.title);
      return success("deal");
    },
    async logActivity(_ctx: AdapterContext, activity) {
      console.log(`[mock:${provider}] logActivity`, activity.type, activity.summary.slice(0, 60));
      return success("activity");
    },
  };
}

export function mockCalendarAdapter(provider: IntegrationProvider): CalendarAdapter {
  return {
    provider,
    async findAvailability(_ctx, { from, durationMin }) {
      // Offer three deterministic evening slots starting the next day
      const base = new Date(from);
      base.setDate(base.getDate() + 1);
      const slots: CalendarSlot[] = [18, 19, 20].map((hour) => {
        const startsAt = new Date(base);
        startsAt.setHours(hour, 0, 0, 0);
        return { startsAt, endsAt: new Date(startsAt.getTime() + durationMin * 60_000) };
      });
      return slots;
    },
    async createEvent(_ctx, event) {
      console.log(`[mock:${provider}] createEvent`, event.title, event.startsAt.toISOString());
      return success("event");
    },
    async cancelEvent(_ctx, externalId) {
      console.log(`[mock:${provider}] cancelEvent`, externalId);
      return { ok: true, externalId };
    },
  };
}

export function mockMessagingAdapter(provider: IntegrationProvider): MessagingAdapter {
  return {
    provider,
    async send(_ctx: AdapterContext, message: OutboundMessage) {
      console.log(`[mock:${provider}] send → ${message.to}: ${message.body.slice(0, 80)}`);
      return success("msg");
    },
  };
}

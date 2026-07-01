import type { IntegrationProvider } from "@/lib/types";
import { PROVIDER_REGISTRY } from "./registry";
import {
  mockCalendarAdapter,
  mockCrmAdapter,
  mockMessagingAdapter,
} from "./adapters/mock";
import type { CalendarAdapter, CrmAdapter, MessagingAdapter } from "./types";

/**
 * Adapter resolution. Dev resolves every provider to its mock; production
 * swaps in real implementations here — call sites never change.
 */

export function getCrmAdapter(provider: IntegrationProvider): CrmAdapter {
  assertCategory(provider, "crm");
  return mockCrmAdapter(provider);
}

export function getCalendarAdapter(provider: IntegrationProvider): CalendarAdapter {
  assertCategory(provider, "calendar");
  return mockCalendarAdapter(provider);
}

export function getMessagingAdapter(provider: IntegrationProvider): MessagingAdapter {
  assertCategory(provider, "messaging");
  return mockMessagingAdapter(provider);
}

function assertCategory(provider: IntegrationProvider, category: string) {
  const info = PROVIDER_REGISTRY.find((p) => p.id === provider);
  if (!info || info.category !== category) {
    throw new Error(`Provider ${provider} is not a ${category} provider`);
  }
}

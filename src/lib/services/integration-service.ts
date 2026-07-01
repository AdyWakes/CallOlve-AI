import { db } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { toJson } from "@/lib/json";
import { PROVIDER_REGISTRY } from "@/lib/integrations/registry";
import type { IntegrationProvider } from "@/lib/types";

export interface IntegrationView {
  provider: IntegrationProvider;
  name: string;
  category: string;
  description: string;
  unlocks: string[];
  status: "connected" | "disconnected" | "error";
  connectedAt: Date | null;
  lastError?: string;
}

/** Registry merged with the user's connection rows. */
export async function listIntegrations(userId: string): Promise<IntegrationView[]> {
  const rows = await db.integration.findMany({ where: { userId } });
  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  return PROVIDER_REGISTRY.map((info) => {
    const row = byProvider.get(info.id);
    let lastError: string | undefined;
    if (row?.status === "error") {
      try {
        lastError = (JSON.parse(row.config) as { lastError?: string }).lastError;
      } catch {
        /* ignore malformed config */
      }
    }
    return {
      provider: info.id,
      name: info.name,
      category: info.category,
      description: info.description,
      unlocks: info.unlocks,
      status: (row?.status as IntegrationView["status"]) ?? "disconnected",
      connectedAt: row?.connectedAt ?? null,
      lastError,
    };
  });
}

/**
 * Connect a provider. In dev this simulates the OAuth handshake and stores a
 * mock config; production redirects through the provider's real OAuth flow
 * and stores encrypted tokens.
 */
export async function connectIntegration(userId: string, provider: IntegrationProvider) {
  const info = PROVIDER_REGISTRY.find((p) => p.id === provider);
  if (!info) throw new ApiError(404, "Unknown provider");

  const integration = await db.integration.upsert({
    where: { userId_provider: { userId, provider } },
    update: {
      status: "connected",
      connectedAt: new Date(),
      config: toJson({ mode: "mock", connectedVia: "dev-oauth-simulation" }),
    },
    create: {
      userId,
      provider,
      category: info.category,
      status: "connected",
      connectedAt: new Date(),
      config: toJson({ mode: "mock", connectedVia: "dev-oauth-simulation" }),
    },
  });

  await db.auditLog.create({
    data: { userId, action: "integration.connected", target: provider },
  });
  return integration;
}

export async function disconnectIntegration(userId: string, provider: string) {
  const existing = await db.integration.findFirst({ where: { userId, provider } });
  if (!existing) throw new ApiError(404, "Integration not connected");

  await db.integration.update({
    where: { id: existing.id },
    data: { status: "disconnected", connectedAt: null, config: "{}" },
  });
  await db.auditLog.create({
    data: { userId, action: "integration.disconnected", target: provider },
  });
  return { disconnected: true };
}

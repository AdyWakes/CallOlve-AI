import type { Metadata } from "next";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { listIntegrations } from "@/lib/services/integration-service";
import { PageHeader } from "@/components/shell/page-header";
import {
  IntegrationCard,
  type IntegrationCardData,
} from "@/components/integrations/integration-card";
import { CATEGORY_LABELS } from "@/lib/integrations/registry";
import { INTEGRATION_CATEGORIES } from "@/lib/types";

export const metadata: Metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  const user = await requireCurrentUser();
  const integrations = await listIntegrations(user.id);
  const connectedCount = integrations.filter((i) => i.status === "connected").length;

  return (
    <>
      <PageHeader
        title="Integrations"
        description={`${connectedCount} connected · every connector uses the same adapter contract, so AI actions sync everywhere automatically.`}
      />

      <div className="space-y-10">
        {INTEGRATION_CATEGORIES.map((category) => {
          const meta = CATEGORY_LABELS[category]!;
          const items = integrations.filter((i) => i.category === category);
          return (
            <section key={category}>
              <h2 className="font-display text-lg font-semibold">{meta.title}</h2>
              <p className="mt-0.5 mb-4 text-sm text-mute">{meta.blurb}</p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((i) => (
                  <IntegrationCard
                    key={i.provider}
                    integration={
                      {
                        ...i,
                        connectedAt: i.connectedAt ? i.connectedAt.toISOString() : null,
                      } as IntegrationCardData
                    }
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-10 rounded-xl border border-line bg-panel px-4 py-3 text-xs text-faint">
        Dev mode: connections simulate the OAuth handshake and run against mock
        adapters (src/lib/integrations/adapters). Production swaps in real
        provider adapters behind the same interfaces — no call-site changes.
      </p>
    </>
  );
}

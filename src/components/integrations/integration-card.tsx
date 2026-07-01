"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiDelete, apiPost, ApiClientError } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, Check, Plug } from "lucide-react";

export interface IntegrationCardData {
  provider: string;
  name: string;
  description: string;
  unlocks: string[];
  status: "connected" | "disconnected" | "error";
  connectedAt: string | null;
  lastError?: string;
}

export function IntegrationCard({ integration }: { integration: IntegrationCardData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connected = integration.status === "connected";
  const errored = integration.status === "error";

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      // Dev: simulated OAuth handshake. Production: redirect to provider OAuth.
      await apiPost("/api/v1/integrations", { provider: integration.provider });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Connection failed");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!window.confirm(`Disconnect ${integration.name}? AI actions will stop syncing to it.`))
      return;
    setBusy(true);
    setError(null);
    try {
      await apiDelete(`/api/v1/integrations/${integration.provider}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Disconnect failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass flex flex-col rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-raised text-brand">
          <Plug className="size-5" />
        </span>
        {connected ? (
          <Badge variant="ok">
            <Check className="size-3" /> Connected
          </Badge>
        ) : errored ? (
          <Badge variant="bad">
            <AlertTriangle className="size-3" /> Error
          </Badge>
        ) : (
          <Badge variant="outline">Not connected</Badge>
        )}
      </div>

      <h3 className="font-display mt-3 text-base font-semibold">{integration.name}</h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-mute">{integration.description}</p>

      <ul className="mt-3 space-y-1">
        {integration.unlocks.map((u) => (
          <li key={u} className="flex items-center gap-1.5 text-xs text-faint">
            <Check className="size-3 text-brand/70" /> {u}
          </li>
        ))}
      </ul>

      {errored && integration.lastError ? (
        <p className="mt-3 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-xs text-bad">
          {integration.lastError}
        </p>
      ) : null}
      {error ? <p className="mt-3 text-xs text-bad">{error}</p> : null}

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <span className="text-xs text-faint">
          {connected && integration.connectedAt
            ? `Since ${formatDate(integration.connectedAt)}`
            : "One-click setup"}
        </span>
        {connected ? (
          <Button variant="secondary" size="sm" onClick={disconnect} disabled={busy}>
            Disconnect
          </Button>
        ) : (
          <Button size="sm" onClick={connect} disabled={busy}>
            {busy ? "Connecting…" : errored ? "Reconnect" : "Connect"}
          </Button>
        )}
      </div>
    </div>
  );
}

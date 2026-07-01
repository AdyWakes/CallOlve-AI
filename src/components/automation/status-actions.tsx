"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, ApiClientError } from "@/lib/client";
import { Button } from "@/components/ui/button";

export interface TransitionOption {
  to: string;
  label: string;
  danger?: boolean;
}

/** Renders the legal status transitions for a record as small action buttons. */
export function StatusActions({
  endpoint,
  transitions,
}: {
  endpoint: string;
  transitions: TransitionOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function move(to: string) {
    setBusy(true);
    setError(null);
    try {
      await apiPatch(endpoint, { status: to });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  if (transitions.length === 0) return null;

  return (
    <span className="flex flex-wrap items-center justify-end gap-1.5">
      {transitions.map((t) => (
        <Button
          key={t.to}
          size="sm"
          variant={t.danger ? "danger" : "secondary"}
          disabled={busy}
          onClick={() => move(t.to)}
        >
          {t.label}
        </Button>
      ))}
      {error ? <span className="w-full text-right text-xs text-bad">{error}</span> : null}
    </span>
  );
}

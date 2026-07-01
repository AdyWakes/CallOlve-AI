"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiDelete, apiPatch } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Pause, Play, Trash2 } from "lucide-react";

export function AssistantActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await apiPatch(`/api/v1/assistants/${id}`, {
        status: status === "active" ? "paused" : "active",
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !window.confirm(
        "Delete this assistant? Its call history is kept, but the configuration is gone for good."
      )
    )
      return;
    setBusy(true);
    try {
      await apiDelete(`/api/v1/assistants/${id}`);
      router.push("/assistants");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={toggle} disabled={busy}>
        {status === "active" ? (
          <>
            <Pause className="size-4" /> Pause
          </>
        ) : (
          <>
            <Play className="size-4" /> Activate
          </>
        )}
      </Button>
      <Button variant="danger" size="sm" onClick={remove} disabled={busy}>
        <Trash2 className="size-4" /> Delete
      </Button>
    </div>
  );
}

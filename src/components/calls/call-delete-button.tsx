"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiDelete } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function CallDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm("Delete this call record? This cannot be undone.")) return;
    setBusy(true);
    try {
      await apiDelete(`/api/v1/calls/${id}`);
      router.push("/calls");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="danger" size="sm" onClick={remove} disabled={busy}>
      <Trash2 className="size-4" /> Delete record
    </Button>
  );
}

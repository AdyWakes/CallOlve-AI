"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input, Select } from "@/components/ui/field";
import { CALL_STATUS_META, INTENT_META } from "@/lib/labels";
import { CALL_STATUSES, INTENTS } from "@/lib/types";
import { Search } from "lucide-react";

export function CallFilters({
  assistants,
}: {
  assistants: { id: string; name: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/calls?${next.toString()}`);
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <form
        className="relative min-w-52 flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          setParam("q", q.trim());
        }}
      >
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
        <Input
          className="pl-9"
          placeholder="Search caller name or number…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>
      <Select
        aria-label="Filter by status"
        className="w-36"
        value={params.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
      >
        <option value="">All statuses</option>
        {CALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {CALL_STATUS_META[s].label}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Filter by intent"
        className="w-40"
        value={params.get("intent") ?? ""}
        onChange={(e) => setParam("intent", e.target.value)}
      >
        <option value="">All intents</option>
        {INTENTS.map((i) => (
          <option key={i} value={i}>
            {INTENT_META[i].label}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Filter by assistant"
        className="w-40"
        value={params.get("assistantId") ?? ""}
        onChange={(e) => setParam("assistantId", e.target.value)}
      >
        <option value="">All assistants</option>
        {assistants.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

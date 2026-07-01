"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiDelete, apiPost, ApiClientError } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Avatar } from "@/components/ui/misc";
import { RELATIONSHIP_META } from "@/lib/labels";
import { RELATIONSHIPS } from "@/lib/types";
import { formatPhone } from "@/lib/utils";
import { MessageSquare, PhoneCall, Plus, Trash2 } from "lucide-react";

export interface EmergencyContactData {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  priority: number;
  notifyBySms: boolean;
  notifyByCall: boolean;
}

export function SosContacts({ contacts }: { contacts: EmergencyContactData[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    relationship: "family",
    priority: contacts.length + 1,
    notifyBySms: true,
    notifyByCall: true,
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/v1/sos/contacts", { ...form, priority: Number(form.priority) });
      setAdding(false);
      setForm({
        name: "",
        phone: "",
        relationship: "family",
        priority: contacts.length + 2,
        notifyBySms: true,
        notifyByCall: true,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not add contact");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Remove ${name} from your emergency contacts?`)) return;
    setBusy(true);
    try {
      await apiDelete(`/api/v1/sos/contacts/${id}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {contacts.length === 0 ? (
        <p className="mb-4 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          No emergency contacts yet — the SOS pipeline has no one to alert. Add at
          least one contact below.
        </p>
      ) : (
        <ul className="mb-4 divide-y divide-line">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-3">
              <span className="font-display w-6 text-center text-sm font-bold text-faint">
                {c.priority}
              </span>
              <Avatar name={c.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{c.name}</p>
                <p className="text-xs text-faint">
                  {formatPhone(c.phone)} · {RELATIONSHIP_META[c.relationship] ?? c.relationship}
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-faint">
                {c.notifyBySms ? <MessageSquare className="size-3.5" aria-label="SMS alerts" /> : null}
                {c.notifyByCall ? <PhoneCall className="size-3.5" aria-label="AI call alerts" /> : null}
              </span>
              <Badge variant={c.priority === 1 ? "bad" : "outline"}>
                {c.priority === 1 ? "First alerted" : `Priority ${c.priority}`}
              </Badge>
              <button
                type="button"
                onClick={() => remove(c.id, c.name)}
                disabled={busy}
                className="rounded-lg p-1.5 text-faint transition hover:bg-bad/10 hover:text-bad"
                aria-label={`Remove ${c.name}`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form onSubmit={add} className="space-y-4 rounded-xl border border-line bg-panel p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              {(id) => (
                <Input id={id} required value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              )}
            </Field>
            <Field label="Phone">
              {(id) => (
                <Input id={id} required value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              )}
            </Field>
            <Field label="Relationship">
              {(id) => (
                <Select id={id} value={form.relationship}
                  onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}>
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>{RELATIONSHIP_META[r]}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Priority (1 = first alerted)">
              {(id) => (
                <Input id={id} type="number" min={1} max={10} value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))} />
              )}
            </Field>
          </div>
          <div className="flex flex-wrap gap-5">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-mute">
              <input type="checkbox" checked={form.notifyBySms} className="size-4 accent-cyan-400"
                onChange={(e) => setForm((f) => ({ ...f, notifyBySms: e.target.checked }))} />
              SMS with live location
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-mute">
              <input type="checkbox" checked={form.notifyByCall} className="size-4 accent-cyan-400"
                onChange={(e) => setForm((f) => ({ ...f, notifyByCall: e.target.checked }))} />
              AI voice call
            </label>
          </div>
          {error ? <p className="text-sm text-bad">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Adding…" : "Add contact"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Add emergency contact
        </Button>
      )}
    </div>
  );
}

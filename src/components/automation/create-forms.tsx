"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, ApiClientError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Plus } from "lucide-react";

/** Collapsible "create record" panel used by the automation pages. */
function CreatePanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="glass group mb-5 rounded-2xl">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-sm font-medium text-mute transition hover:text-fg [&::-webkit-details-marker]:hidden">
        <Plus className="size-4 transition group-open:rotate-45" />
        {title}
      </summary>
      <div className="border-t border-line p-5">{children}</div>
    </details>
  );
}

function useCreate(path: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(data: unknown, onDone: () => void) {
    setBusy(true);
    setError(null);
    try {
      await apiPost(path, data);
      onDone();
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not create record");
    } finally {
      setBusy(false);
    }
  }
  return { create, busy, error };
}

// ─────────────────────────────────────────────── Appointment

export function AppointmentCreateForm() {
  const { create, busy, error } = useCreate("/api/v1/appointments");
  const [form, setForm] = useState({
    contactName: "",
    contactPhone: "",
    service: "",
    date: "",
    time: "18:00",
    durationMin: 60,
    notes: "",
  });

  return (
    <CreatePanel title="New appointment">
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          create(
            {
              contactName: form.contactName,
              contactPhone: form.contactPhone,
              service: form.service,
              startsAt: new Date(`${form.date}T${form.time}`),
              durationMin: Number(form.durationMin),
              status: "confirmed",
              notes: form.notes,
            },
            () =>
              setForm({ contactName: "", contactPhone: "", service: "", date: "", time: "18:00", durationMin: 60, notes: "" })
          );
        }}
      >
        <Field label="Contact name">
          {(id) => (
            <Input id={id} required value={form.contactName}
              onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
          )}
        </Field>
        <Field label="Phone">
          {(id) => (
            <Input id={id} required value={form.contactPhone}
              onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} />
          )}
        </Field>
        <Field label="Service">
          {(id) => (
            <Input id={id} required placeholder="Table reservation (party of 4)" value={form.service}
              onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))} />
          )}
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date" className="col-span-1">
            {(id) => (
              <Input id={id} type="date" required value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            )}
          </Field>
          <Field label="Time">
            {(id) => (
              <Input id={id} type="time" required value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
            )}
          </Field>
          <Field label="Minutes">
            {(id) => (
              <Input id={id} type="number" min={5} max={480} value={form.durationMin}
                onChange={(e) => setForm((f) => ({ ...f, durationMin: Number(e.target.value) }))} />
            )}
          </Field>
        </div>
        <Field label="Notes" className="sm:col-span-2">
          {(id) => (
            <Textarea id={id} className="min-h-16" value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          )}
        </Field>
        {error ? <p className="text-sm text-bad sm:col-span-2">{error}</p> : null}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create appointment"}</Button>
        </div>
      </form>
    </CreatePanel>
  );
}

// ─────────────────────────────────────────────── Order

export function OrderCreateForm() {
  const { create, busy, error } = useCreate("/api/v1/orders");
  const [form, setForm] = useState({
    contactName: "",
    contactPhone: "",
    type: "pickup",
    items: [{ name: "", qty: 1, price: "9.50" }],
    notes: "",
  });

  function setItem(i: number, patch: Partial<{ name: string; qty: number; price: string }>) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    }));
  }

  return (
    <CreatePanel title="New order">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          create(
            {
              contactName: form.contactName,
              contactPhone: form.contactPhone,
              type: form.type,
              items: form.items
                .filter((i) => i.name.trim())
                .map((i) => ({
                  name: i.name.trim(),
                  qty: Number(i.qty) || 1,
                  priceCents: Math.round(parseFloat(i.price || "0") * 100),
                })),
              notes: form.notes,
            },
            () =>
              setForm({ contactName: "", contactPhone: "", type: "pickup", items: [{ name: "", qty: 1, price: "9.50" }], notes: "" })
          );
        }}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Contact name">
            {(id) => (
              <Input id={id} required value={form.contactName}
                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
            )}
          </Field>
          <Field label="Phone">
            {(id) => (
              <Input id={id} required value={form.contactPhone}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} />
            )}
          </Field>
          <Field label="Type">
            {(id) => (
              <Select id={id} value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="pickup">Pickup</option>
                <option value="delivery">Delivery</option>
                <option value="dine_in">Dine-in</option>
              </Select>
            )}
          </Field>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-mute">Items</p>
          {form.items.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_70px_90px] gap-2">
              <Input placeholder="Margherita pizza" value={item.name} aria-label="Item name"
                onChange={(e) => setItem(i, { name: e.target.value })} />
              <Input type="number" min={1} max={99} value={item.qty} aria-label="Quantity"
                onChange={(e) => setItem(i, { qty: Number(e.target.value) })} />
              <Input type="number" step="0.01" min={0} value={item.price} aria-label="Price"
                onChange={(e) => setItem(i, { price: e.target.value })} />
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm"
            onClick={() => setForm((f) => ({ ...f, items: [...f.items, { name: "", qty: 1, price: "9.50" }] }))}>
            <Plus className="size-3.5" /> Add item
          </Button>
        </div>

        {error ? <p className="text-sm text-bad">{error}</p> : null}
        <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create order"}</Button>
      </form>
    </CreatePanel>
  );
}

// ─────────────────────────────────────────────── Lead

export function LeadCreateForm() {
  const { create, busy, error } = useCreate("/api/v1/leads");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    interest: "",
    score: 50,
    notes: "",
  });

  return (
    <CreatePanel title="New lead">
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          create(
            { ...form, score: Number(form.score), source: "manual" },
            () => setForm({ name: "", phone: "", email: "", interest: "", score: 50, notes: "" })
          );
        }}
      >
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
        <Field label="Email (optional)">
          {(id) => (
            <Input id={id} type="email" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          )}
        </Field>
        <Field label={`Score: ${form.score}`}>
          {(id) => (
            <input id={id} type="range" min={0} max={100} value={form.score}
              className="mt-2.5 w-full accent-cyan-400"
              onChange={(e) => setForm((f) => ({ ...f, score: Number(e.target.value) }))} />
          )}
        </Field>
        <Field label="Interest" className="sm:col-span-2">
          {(id) => (
            <Input id={id} placeholder="Private event catering for ~40 people" value={form.interest}
              onChange={(e) => setForm((f) => ({ ...f, interest: e.target.value }))} />
          )}
        </Field>
        {error ? <p className="text-sm text-bad sm:col-span-2">{error}</p> : null}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create lead"}</Button>
        </div>
      </form>
    </CreatePanel>
  );
}

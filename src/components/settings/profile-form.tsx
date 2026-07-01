"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, ApiClientError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { LANGUAGE_META } from "@/lib/labels";
import { LANGUAGES } from "@/lib/types";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
];

export function ProfileForm({
  initial,
}: {
  initial: { name: string; phone: string; timezone: string; language: string };
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await apiPatch("/api/v1/settings/profile", {
        ...form,
        phone: form.phone.trim() || undefined,
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save changes");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          {(id) => (
            <Input
              id={id}
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          )}
        </Field>
        <Field label="Phone">
          {(id) => (
            <Input
              id={id}
              placeholder="+1 555 010 0000"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          )}
        </Field>
        <Field label="Timezone">
          {(id) => (
            <Select
              id={id}
              value={form.timezone}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Preferred language">
          {(id) => (
            <Select
              id={id}
              value={form.language}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {LANGUAGE_META[l]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      {error ? <p className="text-sm text-bad">{error}</p> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
        {saved ? <span className="text-sm text-ok">Saved ✓</span> : null}
      </div>
    </form>
  );
}

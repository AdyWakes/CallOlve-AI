"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, ApiClientError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  ASSISTANT_ROLES,
  LANGUAGES,
  PERSONALITIES,
  TONES,
  VOICES,
} from "@/lib/types";
import {
  LANGUAGE_META,
  PERSONALITY_META,
  ROLE_META,
  TONE_META,
  VOICE_META,
} from "@/lib/labels";
import { ASSISTANT_COLORS } from "@/lib/ai/presets";
import { cn } from "@/lib/utils";

export interface AssistantFormValues {
  name: string;
  role: string;
  personality: string;
  tone: string;
  voice: string;
  language: string;
  greeting: string;
  systemPrompt: string;
  memoryEnabled: boolean;
  color: string;
}

export function AssistantEditForm({
  id,
  initial,
}: {
  id: string;
  initial: AssistantFormValues;
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
      await apiPatch(`/api/v1/assistants/${id}`, form);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          {(fid) => (
            <Input
              id={fid}
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          )}
        </Field>
        <Field label="Role">
          {(fid) => (
            <Select
              id={fid}
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              {ASSISTANT_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_META[r].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Personality">
          {(fid) => (
            <Select
              id={fid}
              value={form.personality}
              onChange={(e) => setForm((f) => ({ ...f, personality: e.target.value }))}
            >
              {PERSONALITIES.map((p) => (
                <option key={p} value={p}>
                  {PERSONALITY_META[p].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Tone">
          {(fid) => (
            <Select
              id={fid}
              value={form.tone}
              onChange={(e) => setForm((f) => ({ ...f, tone: e.target.value }))}
            >
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {TONE_META[t].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Voice">
          {(fid) => (
            <Select
              id={fid}
              value={form.voice}
              onChange={(e) => setForm((f) => ({ ...f, voice: e.target.value }))}
            >
              {VOICES.map((v) => (
                <option key={v} value={v}>
                  {VOICE_META[v].label} — {VOICE_META[v].description}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Language">
          {(fid) => (
            <Select
              id={fid}
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

      <Field label="Greeting">
        {(fid) => (
          <Textarea
            id={fid}
            value={form.greeting}
            onChange={(e) => setForm((f) => ({ ...f, greeting: e.target.value }))}
          />
        )}
      </Field>
      <Field label="Instructions (system prompt)">
        {(fid) => (
          <Textarea
            id={fid}
            className="min-h-36"
            value={form.systemPrompt}
            onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
          />
        )}
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-mute">
          <input
            type="checkbox"
            checked={form.memoryEnabled}
            onChange={(e) => setForm((f) => ({ ...f, memoryEnabled: e.target.checked }))}
            className="size-4 accent-cyan-400"
          />
          Long-term memory enabled
        </label>
        <div className="flex gap-2">
          {ASSISTANT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              onClick={() => setForm((f) => ({ ...f, color: c }))}
              className={cn(
                "size-6 rounded-full border-2 transition",
                form.color === c ? "scale-110 border-fg" : "border-transparent"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-bad">{error}</p> : null}
      <div className="flex items-center gap-3 border-t border-line pt-4">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
        {saved ? <span className="text-sm text-ok">Saved ✓</span> : null}
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, ApiClientError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  ASSISTANT_ROLES,
  LANGUAGES,
  PERSONALITIES,
  TONES,
  VOICES,
  type AssistantRole,
} from "@/lib/types";
import {
  LANGUAGE_META,
  PERSONALITY_META,
  ROLE_META,
  TONE_META,
  VOICE_META,
} from "@/lib/labels";
import { ASSISTANT_COLORS, defaultGreeting, defaultSystemPrompt } from "@/lib/ai/presets";
import { Check, ChevronLeft, ChevronRight, Mic } from "lucide-react";

const STEPS = ["Identity", "Personality & voice", "Behavior"] as const;

export function AssistantWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ greeting: false, prompt: false });

  const [form, setForm] = useState({
    name: "",
    role: "receptionist" as AssistantRole,
    personality: "professional" as (typeof PERSONALITIES)[number],
    tone: "warm" as (typeof TONES)[number],
    voice: "nova" as (typeof VOICES)[number],
    language: "en" as (typeof LANGUAGES)[number],
    greeting: defaultGreeting("receptionist", "your assistant"),
    systemPrompt: defaultSystemPrompt("receptionist"),
    memoryEnabled: true,
    color: ASSISTANT_COLORS[0] as string,
  });

  function applyIdentity(next: { name?: string; role?: AssistantRole }) {
    setForm((f) => {
      const name = next.name ?? f.name;
      const role = next.role ?? f.role;
      return {
        ...f,
        name,
        role,
        greeting: touched.greeting
          ? f.greeting
          : defaultGreeting(role, name.trim() || "your assistant"),
        systemPrompt: touched.prompt ? f.systemPrompt : defaultSystemPrompt(role),
      };
    });
  }

  const canNext = step === 0 ? form.name.trim().length >= 2 : true;

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const created = await apiPost<{ id: string }>("/api/v1/assistants", form);
      router.push(`/assistants/${created.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create assistant");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Step indicator */}
      <ol className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                i < step && "border-brand bg-brand text-slate-950",
                i === step && "border-brand text-brand",
                i > step && "border-line text-faint"
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden text-sm sm:block",
                i === step ? "font-medium text-fg" : "text-faint"
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 ? <span className="h-px flex-1 bg-line" /> : null}
          </li>
        ))}
      </ol>

      <div className="glass rounded-2xl p-7">
        {step === 0 ? (
          <div className="space-y-6">
            <Field label="Assistant name" hint="Callers will hear this name.">
              {(id) => (
                <Input
                  id={id}
                  placeholder="Nova"
                  value={form.name}
                  onChange={(e) => applyIdentity({ name: e.target.value })}
                  autoFocus
                />
              )}
            </Field>
            <div>
              <p className="mb-2 block text-sm font-medium text-mute">Business role</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {ASSISTANT_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => applyIdentity({ role })}
                    className={cn(
                      "rounded-xl border p-4 text-left transition",
                      form.role === role
                        ? "border-brand/60 bg-brand/10"
                        : "border-line bg-panel hover:border-line-bright"
                    )}
                  >
                    <p className="text-sm font-semibold text-fg">{ROLE_META[role].label}</p>
                    <p className="mt-1 text-xs text-mute">{ROLE_META[role].description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-6">
            <div>
              <p className="mb-2 block text-sm font-medium text-mute">Personality</p>
              <div className="flex flex-wrap gap-2">
                {PERSONALITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, personality: p }))}
                    title={PERSONALITY_META[p].description}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm transition",
                      form.personality === p
                        ? "border-brand/60 bg-brand/10 text-brand"
                        : "border-line text-mute hover:border-line-bright hover:text-fg"
                    )}
                  >
                    {PERSONALITY_META[p].label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-faint">
                {PERSONALITY_META[form.personality].description}
              </p>
            </div>

            <div>
              <p className="mb-2 block text-sm font-medium text-mute">Tone</p>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, tone: t }))}
                    title={TONE_META[t].description}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm transition",
                      form.tone === t
                        ? "border-violet-500/60 bg-violet-500/10 text-violet-300"
                        : "border-line text-mute hover:border-line-bright hover:text-fg"
                    )}
                  >
                    {TONE_META[t].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 block text-sm font-medium text-mute">Voice</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {VOICES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, voice: v }))}
                    className={cn(
                      "rounded-xl border p-3.5 text-left transition",
                      form.voice === v
                        ? "border-brand/60 bg-brand/10"
                        : "border-line bg-panel hover:border-line-bright"
                    )}
                  >
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                      <Mic className="size-3.5 text-brand" /> {VOICE_META[v].label}
                    </p>
                    <p className="mt-1 text-xs text-mute">{VOICE_META[v].description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Language">
                {(id) => (
                  <Select
                    id={id}
                    value={form.language}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        language: e.target.value as (typeof LANGUAGES)[number],
                      }))
                    }
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l} value={l}>
                        {LANGUAGE_META[l]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <div>
                <p className="mb-2 block text-sm font-medium text-mute">Accent color</p>
                <div className="flex gap-2.5 pt-1">
                  {ASSISTANT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Color ${c}`}
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className={cn(
                        "size-8 rounded-full border-2 transition",
                        form.color === c ? "scale-110 border-fg" : "border-transparent"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <Field
              label="Greeting"
              hint="The first thing callers hear. Pre-filled from the role — make it yours."
            >
              {(id) => (
                <Textarea
                  id={id}
                  value={form.greeting}
                  onChange={(e) => {
                    setTouched((t) => ({ ...t, greeting: true }));
                    setForm((f) => ({ ...f, greeting: e.target.value }));
                  }}
                />
              )}
            </Field>
            <Field
              label="Instructions (system prompt)"
              hint="What the assistant should do, collect, and never do."
            >
              {(id) => (
                <Textarea
                  id={id}
                  className="min-h-40"
                  value={form.systemPrompt}
                  onChange={(e) => {
                    setTouched((t) => ({ ...t, prompt: true }));
                    setForm((f) => ({ ...f, systemPrompt: e.target.value }));
                  }}
                />
              )}
            </Field>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-panel p-4">
              <input
                type="checkbox"
                checked={form.memoryEnabled}
                onChange={(e) => setForm((f) => ({ ...f, memoryEnabled: e.target.checked }))}
                className="mt-0.5 size-4 accent-cyan-400"
              />
              <span>
                <span className="block text-sm font-medium text-fg">Long-term memory</span>
                <span className="block text-xs text-mute">
                  Remember returning callers and their preferences across conversations.
                </span>
              </span>
            </label>
          </div>
        ) : null}

        {error ? (
          <p className="mt-5 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || busy}
          >
            <ChevronLeft className="size-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Continue <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button type="button" onClick={create} disabled={busy}>
              {busy ? "Creating…" : "Create assistant"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

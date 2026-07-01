"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, ApiClientError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";
import { Eye, EyeOff, Lock } from "lucide-react";

export function UnlockForm({ next }: { next?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/unlock", { password });
      router.push(next && next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Incorrect password");
      setBusy(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-7">
      <span className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Lock className="size-5" />
      </span>
      <h1 className="font-display text-xl font-bold">Private preview</h1>
      <p className="mt-1 text-sm text-mute">Enter the access password to continue.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Access password">
          {(id) => (
            <div className="relative">
              <Input
                id={id}
                type={show ? "text" : "password"}
                required
                autoFocus
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-faint transition hover:text-fg"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          )}
        </Field>
        {error ? (
          <p className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Spinner className="border-slate-900/40 border-t-slate-900" /> : "Unlock"}
        </Button>
      </form>
    </div>
  );
}

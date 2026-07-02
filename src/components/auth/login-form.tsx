"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost, ApiClientError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/auth/login", { email, password });
      router.push(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Login failed");
      setBusy(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-7">
      <h1 className="font-display text-xl font-bold">Welcome back</h1>
      <p className="mt-1 text-sm text-mute">Log in to your CallOlve AI workspace.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Email">
          {(id) => (
            <Input
              id={id}
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>
        <Field label="Password">
          {(id) => (
            <Input
              id={id}
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        {error ? (
          <p className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Spinner className="border-slate-900/40 border-t-slate-900" /> : "Log in"}
        </Button>
      </form>

      <div className="mt-5 rounded-lg border border-line bg-panel px-3 py-2.5 text-xs text-mute">
        <span className="font-semibold text-fg">Demo account:</span>{" "}
        demo@callolve.ai · demo1234
      </div>

      <p className="mt-5 text-center text-sm text-mute">
        New to CallOlve?{" "}
        <Link href="/signup" className="font-medium text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

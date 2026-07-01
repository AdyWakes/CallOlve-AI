"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost, ApiClientError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", company: "" });
  const [error, setError] = useState<ApiClientError | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/auth/signup", {
        ...form,
        company: form.company.trim() || undefined,
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err : new ApiClientError("Signup failed")
      );
      setBusy(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-7">
      <h1 className="font-display text-xl font-bold">Create your workspace</h1>
      <p className="mt-1 text-sm text-mute">
        Free to start. Your first AI assistant is minutes away.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Full name" error={error?.field("name")}>
          {(id) => (
            <Input id={id} required autoComplete="name" placeholder="Alex Carter"
              value={form.name} onChange={set("name")} />
          )}
        </Field>
        <Field label="Email" error={error?.field("email")}>
          {(id) => (
            <Input id={id} type="email" required autoComplete="email"
              placeholder="you@company.com" value={form.email} onChange={set("email")} />
          )}
        </Field>
        <Field label="Password" error={error?.field("password")} hint="At least 8 characters">
          {(id) => (
            <Input id={id} type="password" required autoComplete="new-password"
              placeholder="••••••••" value={form.password} onChange={set("password")} />
          )}
        </Field>
        <Field label="Company (optional)" error={error?.field("company")}>
          {(id) => (
            <Input id={id} placeholder="Acme Dental" value={form.company} onChange={set("company")} />
          )}
        </Field>
        {error && !error.details ? (
          <p className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
            {error.message}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Spinner className="border-slate-900/40 border-t-slate-900" /> : "Create account"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-mute">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

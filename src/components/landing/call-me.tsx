"use client";

import { useState } from "react";
import { apiPost, ApiClientError } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";
import { PhoneCall, PhoneOutgoing, Sparkles } from "lucide-react";

export function CallMe() {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "calling" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("calling");
    setError(null);
    try {
      await apiPost("/api/v1/voice/call-me", { phone });
      setStatus("done");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not place the call");
      setStatus("error");
    }
  }

  return (
    <section id="try" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="glass glow-brand rounded-3xl p-8 text-center sm:p-12">
        <Badge variant="brand" className="mb-4">
          <Sparkles className="size-3" /> Try it live
        </Badge>
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Get a call from our <span className="text-gradient">AI receptionist</span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-mute">
          Enter your number and Nova will call you in seconds. Try booking a table,
          placing an order, or asking a question — just like a real customer would.
        </p>

        {status === "done" ? (
          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-ok/30 bg-ok/10 p-6">
            <PhoneCall className="mx-auto size-8 text-ok" />
            <p className="font-display mt-3 text-lg font-semibold text-ok">Calling you now</p>
            <p className="mt-1 text-sm text-mute">
              Answer your phone — Nova is on the line. After the call, the booking
              and transcript appear in the dashboard.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => {
                setStatus("idle");
                setPhone("");
              }}
            >
              Call another number
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
            <Input
              type="tel"
              required
              placeholder="+91 98XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 text-center sm:text-left"
              disabled={status === "calling"}
            />
            <Button type="submit" size="lg" className="shrink-0" disabled={status === "calling"}>
              {status === "calling" ? (
                <>
                  <Spinner className="border-slate-900/40 border-t-slate-900" /> Calling…
                </>
              ) : (
                <>
                  <PhoneOutgoing className="size-4" /> Call me now
                </>
              )}
            </Button>
          </form>
        )}

        {error ? (
          <p className="mx-auto mt-4 max-w-md rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
            {error}
          </p>
        ) : (
          <p className="mt-4 text-xs text-faint">
            Use international format with your country code. Your number is used only to place this demo call.
          </p>
        )}
      </div>
    </section>
  );
}

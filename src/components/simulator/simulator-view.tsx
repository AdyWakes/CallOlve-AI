"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiPost, ApiClientError } from "@/lib/client";
import { Badge, LiveDot } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Spinner } from "@/components/ui/misc";
import { Input } from "@/components/ui/field";
import { INTENT_META, OUTCOME_META, ROLE_META } from "@/lib/labels";
import type { AssistantRole, Intent, Outcome, TranscriptTurn } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";
import {
  CalendarCheck,
  Check,
  Phone,
  PhoneOff,
  Send,
  ShoppingBag,
  Target,
} from "lucide-react";

interface AssistantOption {
  id: string;
  name: string;
  role: string;
  status: string;
  color: string;
  greeting: string;
}

interface EngineState {
  intent: string | null;
  stage: string;
  slots: Record<string, unknown>;
  transcript: TranscriptTurn[];
  actions: { type: string; label: string; status: string }[];
  startedAtMs: number;
  done: boolean;
  outcome?: string;
}

interface CompletedCall {
  id: string;
  intent: string | null;
  outcome: string | null;
  summary: string | null;
  durationSec: number;
  satisfaction: number | null;
  appointment: { id: string } | null;
  order: { id: string } | null;
  lead: { id: string } | null;
}

const SUGGESTIONS = [
  "Hi, I'd like to book a table for 4 tomorrow at 7pm",
  "I'd like to order two margherita pizzas and a coke",
  "Is the 2-bedroom apartment still available? What's the price?",
  "My order arrived damaged and I want a refund",
  "What are your opening hours?",
];

type Phase = "setup" | "live" | "saving" | "done";

export function SimulatorView({
  assistants,
  preselectId,
}: {
  assistants: AssistantOption[];
  preselectId?: string;
}) {
  const [assistantId, setAssistantId] = useState(
    preselectId && assistants.some((a) => a.id === preselectId)
      ? preselectId
      : (assistants[0]?.id ?? "")
  );
  const assistant = assistants.find((a) => a.id === assistantId);

  const [phase, setPhase] = useState<Phase>("setup");
  const [state, setState] = useState<EngineState | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<CompletedCall | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // call timer
  useEffect(() => {
    if (phase !== "live" || !state) return;
    const t = setInterval(
      () => setElapsed(Math.round((Date.now() - state.startedAtMs) / 1000)),
      1000
    );
    return () => clearInterval(t);
  }, [phase, state]);

  // autoscroll transcript
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [state?.transcript.length, phase]);

  async function startCall() {
    if (!assistantId) return;
    setBusy(true);
    setError(null);
    try {
      const turn = await apiPost<{ state: EngineState }>("/api/v1/simulator/respond", {
        assistantId,
      });
      setState(turn.state);
      setPhase("live");
      setElapsed(0);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not start the call");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    const utterance = input.trim();
    if (!utterance || !state || busy) return;
    setBusy(true);
    setError(null);
    setInput("");
    try {
      const turn = await apiPost<{ state: EngineState; done: boolean }>(
        "/api/v1/simulator/respond",
        { assistantId, state, utterance }
      );
      setState(turn.state);
      if (turn.done) await endCall(turn.state);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Engine error");
    } finally {
      setBusy(false);
    }
  }

  async function endCall(finalState?: EngineState) {
    const s = finalState ?? state;
    if (!s || s.transcript.length === 0) {
      reset();
      return;
    }
    setPhase("saving");
    try {
      const call = await apiPost<CompletedCall>("/api/v1/simulator/complete", {
        assistantId,
        state: s,
      });
      setResult(call);
      setPhase("done");
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not save the call");
      setPhase("live");
    }
  }

  function reset() {
    setPhase("setup");
    setState(null);
    setResult(null);
    setElapsed(0);
    setError(null);
  }

  if (assistants.length === 0) {
    return (
      <Card>
        <CardBody className="py-14 text-center">
          <p className="font-display text-lg font-semibold">No assistants to test</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-mute">
            Create an assistant first — then come back and talk to it like a real caller.
          </p>
          <ButtonLink href="/assistants/new" className="mt-5">
            Create an assistant
          </ButtonLink>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Call window */}
      <Card className="flex min-h-[640px] flex-col lg:col-span-2">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line p-4">
          <div className="flex items-center gap-3">
            {assistant ? (
              <>
                <Avatar name={assistant.name} color={assistant.color} className="size-10" />
                <div>
                  <p className="font-display text-sm font-semibold">{assistant.name}</p>
                  <p className="text-xs text-faint">
                    {ROLE_META[assistant.role as AssistantRole]?.label}
                  </p>
                </div>
              </>
            ) : null}
          </div>
          {phase === "live" ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm text-ok">
                <LiveDot /> {formatDuration(elapsed)}
              </span>
              <Button variant="danger" size="sm" onClick={() => endCall()}>
                <PhoneOff className="size-4" /> End call
              </Button>
            </div>
          ) : phase === "setup" ? (
            <Badge variant="default">Ready</Badge>
          ) : phase === "saving" ? (
            <Badge variant="warn">Saving…</Badge>
          ) : (
            <Badge variant="ok">Call saved</Badge>
          )}
        </div>

        {/* Transcript / setup */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
          {phase === "setup" ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="glow-brand flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500">
                <Phone className="size-7 text-slate-950" />
              </span>
              <h2 className="font-display mt-5 text-lg font-semibold">
                Simulate an incoming call
              </h2>
              <p className="mt-1 max-w-sm text-sm text-mute">
                You play the caller. {assistant?.name ?? "Your assistant"} answers, understands,
                and executes — exactly like on a real phone line.
              </p>
              <Button className="mt-6" size="lg" onClick={startCall} disabled={busy || !assistantId}>
                {busy ? <Spinner /> : <Phone className="size-4" />} Start call
              </Button>
            </div>
          ) : (
            <>
              {state?.transcript.map((t, i) => (
                <div key={i} className={cn("flex", t.speaker === "caller" && "justify-end")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                      t.speaker === "caller"
                        ? "rounded-br-sm bg-raised text-mute"
                        : "rounded-bl-sm bg-brand/10 text-fg"
                    )}
                  >
                    <span className="mb-0.5 block text-[10px] font-semibold tracking-wide uppercase opacity-60">
                      {t.speaker === "caller" ? "You (caller)" : assistant?.name}
                    </span>
                    {t.text}
                  </div>
                </div>
              ))}
              {busy && phase === "live" ? (
                <div className="flex">
                  <div className="rounded-2xl rounded-bl-sm bg-brand/10 px-4 py-3">
                    <Spinner className="size-3.5" />
                  </div>
                </div>
              ) : null}

              {phase === "done" && result ? (
                <CallResult result={result} onReset={reset} />
              ) : null}
            </>
          )}
        </div>

        {/* Composer */}
        {phase === "live" ? (
          <div className="border-t border-line p-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Speak as the caller…"
                autoFocus
                disabled={busy}
              />
              <Button type="submit" disabled={busy || !input.trim()} aria-label="Send">
                <Send className="size-4" />
              </Button>
            </form>
            {error ? <p className="mt-2 text-xs text-bad">{error}</p> : null}
          </div>
        ) : null}
      </Card>

      {/* Side panel */}
      <div className="space-y-6">
        <Card>
          <CardHeader title="Assistant" subtitle="Who picks up the phone" />
          <CardBody className="space-y-2">
            {assistants.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={phase === "live" || phase === "saving"}
                onClick={() => setAssistantId(a.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition disabled:opacity-60",
                  a.id === assistantId
                    ? "border-brand/50 bg-brand/10"
                    : "border-line bg-panel hover:border-line-bright"
                )}
              >
                <Avatar name={a.name} color={a.color} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-fg">{a.name}</span>
                  <span className="block text-xs text-faint">
                    {ROLE_META[a.role as AssistantRole]?.label}
                  </span>
                </span>
                {a.id === assistantId ? <Check className="size-4 text-brand" /> : null}
              </button>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Try saying" subtitle="Sample caller openers" />
          <CardBody className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  if (phase === "setup") startCall().then(() => setInput(s));
                  else setInput(s);
                }}
                className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-left text-xs text-mute transition hover:border-brand/40 hover:text-fg"
              >
                “{s}”
              </button>
            ))}
          </CardBody>
        </Card>

        {state && phase !== "setup" ? (
          <Card>
            <CardHeader title="Engine state" subtitle="What the AI has understood" />
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-mute">Intent</span>
                {state.intent ? (
                  <Badge variant={INTENT_META[state.intent as Intent]?.variant ?? "default"}>
                    {INTENT_META[state.intent as Intent]?.label ?? state.intent}
                  </Badge>
                ) : (
                  <span className="text-faint">listening…</span>
                )}
              </div>
              {state.actions.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-xs font-medium tracking-wide text-faint uppercase">
                    Actions queued
                  </p>
                  <ul className="space-y-1.5">
                    {state.actions.map((a, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-ok">
                        <Check className="size-3.5" /> {a.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function CallResult({ result, onReset }: { result: CompletedCall; onReset: () => void }) {
  const intent = result.intent ? INTENT_META[result.intent as Intent] : null;
  const outcome = result.outcome ? OUTCOME_META[result.outcome as Outcome] : null;
  return (
    <div className="glass mt-4 rounded-2xl border-brand/30 p-5">
      <p className="font-display text-sm font-semibold text-fg">Call complete — saved to your log</p>
      <p className="mt-1 text-sm text-mute">{result.summary}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {intent ? <Badge variant={intent.variant}>{intent.label}</Badge> : null}
        {outcome ? <Badge variant={outcome.variant}>{outcome.label}</Badge> : null}
        <Badge variant="default">{formatDuration(result.durationSec)}</Badge>
        {result.satisfaction ? <Badge variant="ok">CSAT {result.satisfaction}/5</Badge> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink href={`/calls/${result.id}`} size="sm" variant="secondary">
          View call record
        </ButtonLink>
        {result.appointment ? (
          <ButtonLink href="/appointments" size="sm" variant="secondary">
            <CalendarCheck className="size-3.5" /> View appointment
          </ButtonLink>
        ) : null}
        {result.order ? (
          <ButtonLink href="/orders" size="sm" variant="secondary">
            <ShoppingBag className="size-3.5" /> View order
          </ButtonLink>
        ) : null}
        {result.lead ? (
          <ButtonLink href="/leads" size="sm" variant="secondary">
            <Target className="size-3.5" /> View lead
          </ButtonLink>
        ) : null}
        <Button size="sm" onClick={onReset}>
          <Phone className="size-3.5" /> New call
        </Button>
      </div>
    </div>
  );
}

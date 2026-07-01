"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiPost, ApiClientError } from "@/lib/client";
import { Badge, LiveDot } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Spinner } from "@/components/ui/misc";
import { INTENT_META, OUTCOME_META, ROLE_META } from "@/lib/labels";
import type { AssistantRole, ExtractedAction, Intent, Outcome, TranscriptTurn } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";
import { listenOnce, localeFor, speak, speechSupported, stopSpeaking } from "./speech";
import {
  CalendarCheck,
  Check,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  ShoppingBag,
  Sparkles,
  Target,
} from "lucide-react";

interface AssistantOption {
  id: string;
  name: string;
  role: string;
  color: string;
  language: string;
}

interface ChatMessage {
  role: string;
  content: string | null;
  [k: string]: unknown;
}

interface TurnResult {
  reply: string;
  messages: ChatMessage[];
  newActions: ExtractedAction[];
  slots: Record<string, unknown>;
  intent: Intent | null;
  outcome: Outcome | null;
  done: boolean;
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

type Phase = "setup" | "live" | "saving" | "done";
type VoiceState = "idle" | "speaking" | "listening" | "thinking";

export function VoiceCall({
  assistants,
  llmReady,
  preselectId,
}: {
  assistants: AssistantOption[];
  llmReady: boolean;
  preselectId?: string;
}) {
  const [assistantId, setAssistantId] = useState(
    preselectId && assistants.some((a) => a.id === preselectId)
      ? preselectId
      : (assistants[0]?.id ?? "")
  );
  const assistant = assistants.find((a) => a.id === assistantId);

  const [phase, setPhase] = useState<Phase>("setup");
  const [voice, setVoice] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [partial, setPartial] = useState("");
  const [actions, setActions] = useState<ExtractedAction[]>([]);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<CompletedCall | null>(null);
  const [supported, setSupported] = useState(true);

  // mutable call state that shouldn't trigger re-renders
  const messagesRef = useRef<ChatMessage[]>([]);
  const slotsRef = useRef<Record<string, unknown>>({});
  const outcomeRef = useRef<Outcome | null>(null);
  const startedAtRef = useRef<number>(0);
  const stopListenRef = useRef<() => void>(() => {});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSupported(speechSupported()), []);

  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript.length, partial, phase]);

  const addTurn = useCallback((speaker: "assistant" | "caller", text: string) => {
    setTranscript((prev) => [
      ...prev,
      { speaker, text, at: Math.round((Date.now() - startedAtRef.current) / 1000) },
    ]);
  }, []);

  async function startCall() {
    if (!assistantId || !llmReady) return;
    setError(null);
    setPhase("live");
    setVoice("thinking");
    startedAtRef.current = Date.now();
    try {
      const turn = await apiPost<TurnResult>("/api/v1/voice/respond", { assistantId });
      messagesRef.current = turn.messages;
      addTurn("assistant", turn.reply);
      setVoice("speaking");
      await speak(turn.reply, assistant?.language ?? "en");
      await captureCallerTurn();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not start the call");
      setVoice("idle");
    }
  }

  async function captureCallerTurn() {
    if (!supported) {
      setVoice("idle");
      return;
    }
    setVoice("listening");
    setPartial("");
    const { promise, stop } = listenOnce(localeFor(assistant?.language ?? "en"), setPartial);
    stopListenRef.current = stop;
    let said = "";
    try {
      said = await promise;
    } catch {
      said = "";
    }
    setPartial("");
    if (!said) {
      // nothing heard — wait for the user to tap the mic again
      setVoice("idle");
      return;
    }
    await sendUtterance(said);
  }

  async function sendUtterance(utterance: string) {
    addTurn("caller", utterance);
    setVoice("thinking");
    try {
      const turn = await apiPost<TurnResult>("/api/v1/voice/respond", {
        assistantId,
        messages: messagesRef.current,
        utterance,
      });
      messagesRef.current = turn.messages;
      if (turn.newActions.length) setActions((prev) => [...prev, ...turn.newActions]);
      if (turn.intent) setIntent((prev) => prev ?? turn.intent);
      if (turn.outcome) outcomeRef.current = turn.outcome;
      Object.assign(slotsRef.current, turn.slots);

      addTurn("assistant", turn.reply);
      setVoice("speaking");
      await speak(turn.reply, assistant?.language ?? "en");

      if (turn.done) {
        await endCall();
      } else {
        await captureCallerTurn();
      }
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Engine error");
      setVoice("idle");
    }
  }

  async function endCall() {
    stopListenRef.current();
    stopSpeaking();
    setVoice("idle");
    setTranscript((current) => {
      void persist(current);
      return current;
    });
  }

  async function persist(turns: TranscriptTurn[]) {
    if (turns.length === 0) {
      reset();
      return;
    }
    setPhase("saving");
    try {
      const call = await apiPost<CompletedCall>("/api/v1/voice/complete", {
        assistantId,
        transcript: turns,
        actions,
        slots: slotsRef.current,
        intent,
        outcome: outcomeRef.current,
        startedAtMs: startedAtRef.current,
        callerName: typeof slotsRef.current.name === "string" ? slotsRef.current.name : undefined,
        callerPhone: typeof slotsRef.current.phone === "string" ? slotsRef.current.phone : undefined,
      });
      setResult(call);
      setPhase("done");
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not save the call");
      setPhase("live");
    }
  }

  function reset() {
    stopListenRef.current();
    stopSpeaking();
    setPhase("setup");
    setVoice("idle");
    setTranscript([]);
    setActions([]);
    setIntent(null);
    setResult(null);
    setElapsed(0);
    setPartial("");
    messagesRef.current = [];
    slotsRef.current = {};
    outcomeRef.current = null;
  }

  if (assistants.length === 0) {
    return (
      <Card>
        <CardBody className="py-14 text-center">
          <p className="font-display text-lg font-semibold">No assistants to call</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-mute">
            Create an assistant first, then call it here.
          </p>
          <ButtonLink href="/assistants/new" className="mt-5">Create an assistant</ButtonLink>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="flex min-h-[640px] flex-col lg:col-span-2">
        {/* header */}
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
              <Button variant="danger" size="sm" onClick={endCall}>
                <PhoneOff className="size-4" /> End
              </Button>
            </div>
          ) : phase === "done" ? (
            <Badge variant="ok">Call saved</Badge>
          ) : phase === "saving" ? (
            <Badge variant="warn">Saving…</Badge>
          ) : (
            <Badge variant="brand">
              <Sparkles className="size-3" /> AI voice
            </Badge>
          )}
        </div>

        {/* body */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
          {phase === "setup" ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="glow-brand flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500">
                <Phone className="size-7 text-slate-950" />
              </span>
              <h2 className="font-display mt-5 text-lg font-semibold">Call {assistant?.name}</h2>
              <p className="mt-1 max-w-sm text-sm text-mute">
                Speak naturally — {assistant?.name} listens, replies out loud, and does the
                work. Allow microphone access when prompted.
              </p>
              {!llmReady ? (
                <p className="mt-5 max-w-sm rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
                  Live AI voice needs a GitHub Models token in <code>.env</code>
                  (<code>GITHUB_MODELS_TOKEN</code>). Until then, use the deterministic
                  text simulator.
                </p>
              ) : !supported ? (
                <p className="mt-5 max-w-sm rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
                  Your browser doesn&apos;t support the Web Speech API. Use Chrome or Edge for
                  the voice demo.
                </p>
              ) : null}
              <Button className="mt-6" size="lg" onClick={startCall} disabled={!llmReady}>
                <Phone className="size-4" /> Start call
              </Button>
            </div>
          ) : (
            <>
              {transcript.map((t, i) => (
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
              {partial ? (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-raised/50 px-4 py-2.5 text-sm text-faint italic">
                    {partial}…
                  </div>
                </div>
              ) : null}
              {phase === "done" && result ? <CallResult result={result} onReset={reset} /> : null}
            </>
          )}
        </div>

        {/* controls */}
        {phase === "live" ? (
          <div className="flex items-center justify-center gap-3 border-t border-line p-4">
            <VoiceIndicator state={voice} onMic={captureCallerTurn} />
          </div>
        ) : null}
      </Card>

      {/* side */}
      <div className="space-y-6">
        <Card>
          <CardHeader title="Assistant" subtitle="Who answers" />
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

        {phase !== "setup" ? (
          <Card>
            <CardHeader title="Live intelligence" subtitle="What the AI understood" />
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-mute">Intent</span>
                {intent ? (
                  <Badge variant={INTENT_META[intent]?.variant ?? "default"}>
                    {INTENT_META[intent]?.label ?? intent}
                  </Badge>
                ) : (
                  <span className="text-faint">listening…</span>
                )}
              </div>
              {actions.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-xs font-medium tracking-wide text-faint uppercase">
                    Actions executed
                  </p>
                  <ul className="space-y-1.5">
                    {actions.map((a, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-ok">
                        <Check className="size-3.5" /> {a.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-faint">No actions yet.</p>
              )}
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardHeader title="How it works" />
            <CardBody className="space-y-2 text-xs text-mute">
              <p>1. You speak — the browser transcribes your voice.</p>
              <p>2. GitHub Models decides what to say and which action to take.</p>
              <p>3. The assistant replies out loud and books / orders / captures via the live API.</p>
              <p>4. End the call — it&apos;s saved with a transcript, summary, and records.</p>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

function VoiceIndicator({ state, onMic }: { state: VoiceState; onMic: () => void }) {
  if (state === "thinking")
    return (
      <span className="flex items-center gap-2 text-sm text-mute">
        <Spinner className="size-4" /> Thinking…
      </span>
    );
  if (state === "speaking")
    return (
      <span className="flex items-center gap-2 text-sm text-brand">
        <span className="flex gap-0.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="w-1 animate-wave rounded-full bg-brand"
              style={{ height: 16, animationDelay: `${i * 120}ms` }}
            />
          ))}
        </span>
        Speaking…
      </span>
    );
  if (state === "listening")
    return (
      <button
        type="button"
        onClick={onMic}
        className="flex items-center gap-2 rounded-full bg-ok/15 px-5 py-2.5 text-sm font-medium text-ok"
      >
        <Mic className="size-4 animate-pulse" /> Listening — tap to stop
      </button>
    );
  // idle — prompt to talk
  return (
    <button
      type="button"
      onClick={onMic}
      className="flex items-center gap-2 rounded-full bg-brand/15 px-5 py-2.5 text-sm font-medium text-brand transition hover:bg-brand/25"
    >
      <MicOff className="size-4" /> Tap to speak
    </button>
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
            <CalendarCheck className="size-3.5" /> Appointment
          </ButtonLink>
        ) : null}
        {result.order ? (
          <ButtonLink href="/orders" size="sm" variant="secondary">
            <ShoppingBag className="size-3.5" /> Order
          </ButtonLink>
        ) : null}
        {result.lead ? (
          <ButtonLink href="/leads" size="sm" variant="secondary">
            <Target className="size-3.5" /> Lead
          </ButtonLink>
        ) : null}
        <Button size="sm" onClick={onReset}>
          <Phone className="size-3.5" /> New call
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPost, ApiClientError } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { cn, formatDateTime } from "@/lib/utils";
import type { SosTimelineEntry } from "@/lib/types";
import {
  Check,
  CircleAlert,
  MapPin,
  Mic,
  PhoneCall,
  Shield,
  Siren,
  Timer,
  UserCheck,
  X,
} from "lucide-react";

export interface ActiveSosEvent {
  id: string;
  status: string;
  startedAt: string;
  triggerLabel: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  timeline: SosTimelineEntry[];
}

const ENTRY_ICONS: Record<SosTimelineEntry["type"], React.ElementType> = {
  triggered: Siren,
  countdown: Timer,
  location: MapPin,
  contact_notified: UserCheck,
  ai_call: PhoneCall,
  recording: Mic,
  escalation: CircleAlert,
  note: CircleAlert,
  resolved: Check,
  cancelled: X,
};

export function SosPanel({ activeEvent }: { activeEvent: ActiveSosEvent | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // 1s tick drives the live timeline playback
  useEffect(() => {
    if (!activeEvent) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [activeEvent]);

  async function trigger() {
    if (
      !window.confirm(
        "Trigger a simulated SOS event? The full dispatch pipeline will run against your emergency contacts (simulation — no real messages are sent)."
      )
    )
      return;
    setBusy(true);
    setError(null);

    const location = await new Promise<{ lat?: number; lng?: number }>((resolve) => {
      if (!navigator.geolocation) return resolve({});
      const timeout = setTimeout(() => resolve({}), 3000);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timeout);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          clearTimeout(timeout);
          resolve({});
        },
        { timeout: 2500 }
      );
    });

    try {
      await apiPost("/api/v1/sos/events", { triggerType: "manual", ...location });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not trigger SOS");
    } finally {
      setBusy(false);
    }
  }

  async function close(status: "resolved" | "cancelled" | "false_alarm") {
    if (!activeEvent) return;
    setBusy(true);
    setError(null);
    try {
      await apiPatch(`/api/v1/sos/events/${activeEvent.id}`, { status });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not update the event");
    } finally {
      setBusy(false);
    }
  }

  // ── armed state (no active event)
  if (!activeEvent) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-ok/10 text-ok">
            <Shield className="size-7" />
          </span>
          <h2 className="font-display mt-4 text-lg font-semibold">Protection armed</h2>
          <p className="mt-1 max-w-md text-sm text-mute">
            Triple-press your phone&apos;s power button, use a paired wearable, or press
            the button below. Your contacts get your live location and an AI call
            within seconds.
          </p>
          <button
            type="button"
            onClick={trigger}
            disabled={busy}
            className={cn(
              "mt-8 flex size-36 flex-col items-center justify-center gap-1 rounded-full",
              "bg-gradient-to-br from-red-500 to-rose-600 font-display text-2xl font-bold text-white",
              "shadow-[0_0_60px_-10px_rgba(248,113,113,0.6)] transition",
              "hover:scale-105 hover:shadow-[0_0_80px_-10px_rgba(248,113,113,0.8)]",
              "focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-red-400",
              "disabled:opacity-60"
            )}
          >
            <Siren className="size-8" />
            SOS
          </button>
          <p className="mt-6 text-xs text-faint">
            Simulation mode — runs the real pipeline without sending real alerts.
          </p>
          {error ? <p className="mt-3 text-sm text-bad">{error}</p> : null}
        </CardBody>
      </Card>
    );
  }

  // ── active event: live timeline playback
  const now = Date.now();
  const startedMs = new Date(activeEvent.timeline[0]?.ts ?? activeEvent.startedAt).getTime();
  const inGraceWindow = now - startedMs < 10_000;

  return (
    <Card className="border-bad/40">
      <CardHeader
        title={
          <span className="flex items-center gap-2 text-bad">
            <Siren className="size-5 animate-pulse-soft" /> SOS ACTIVE
          </span>
        }
        subtitle={`Triggered ${formatDateTime(activeEvent.startedAt)} · ${activeEvent.triggerLabel}`}
        action={<Badge variant="bad">LIVE</Badge>}
      />
      <CardBody>
        {activeEvent.address || activeEvent.lat ? (
          <p className="mb-5 flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-3 text-sm text-mute">
            <MapPin className="size-4 shrink-0 text-bad" />
            {activeEvent.address ??
              `Live location: ${activeEvent.lat?.toFixed(4)}, ${activeEvent.lng?.toFixed(4)}`}
            <span className="ml-auto text-xs text-faint">sharing live</span>
          </p>
        ) : null}

        <ol className="relative space-y-4 border-l border-line pl-6">
          {activeEvent.timeline.map((entry, i) => {
            const happened = new Date(entry.ts).getTime() <= now;
            const Icon = ENTRY_ICONS[entry.type] ?? CircleAlert;
            return (
              <li key={i} className={cn("relative transition", !happened && "opacity-40")}>
                <span
                  className={cn(
                    "absolute top-0 -left-[31px] flex size-5 items-center justify-center rounded-full border bg-bg",
                    happened ? "border-bad/60 text-bad" : "border-line text-faint"
                  )}
                >
                  {happened ? (
                    <Icon className="size-3" />
                  ) : (
                    <span className="size-1.5 animate-pulse rounded-full bg-faint" />
                  )}
                </span>
                <p className="text-sm font-medium text-fg">
                  {entry.label}
                  {!happened ? <span className="ml-2 text-xs text-faint">pending…</span> : null}
                </p>
                {entry.detail ? <p className="mt-0.5 text-xs text-mute">{entry.detail}</p> : null}
                <p className="mt-0.5 text-[10px] text-faint">
                  {new Date(entry.ts).toLocaleTimeString()}
                </p>
              </li>
            );
          })}
        </ol>

        {error ? <p className="mt-4 text-sm text-bad">{error}</p> : null}

        <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
          {inGraceWindow ? (
            <Button variant="secondary" onClick={() => close("cancelled")} disabled={busy}>
              <X className="size-4" /> Cancel (grace window)
            </Button>
          ) : (
            <>
              <Button onClick={() => close("resolved")} disabled={busy}>
                <Check className="size-4" /> I&apos;m safe — resolve
              </Button>
              <Button variant="secondary" onClick={() => close("false_alarm")} disabled={busy}>
                False alarm
              </Button>
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

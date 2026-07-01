import type { SosTimelineEntry, SosTrigger } from "@/lib/types";
import { SOS_TRIGGER_META } from "@/lib/labels";

/**
 * SOS dispatch pipeline.
 *
 * Builds the dispatch plan for a new emergency event: the ordered timeline of
 * everything the platform does once a trigger fires. In this build the plan is
 * computed up front with realistic timestamps and the UI plays it back live;
 * in production each entry is appended by the actual worker that performed
 * the step (SMS sender, AI dialer, recorder) — same shape, same UI.
 */

export interface DispatchContact {
  id: string;
  name: string;
  priority: number;
  notifyBySms: boolean;
  notifyByCall: boolean;
}

export function buildDispatchTimeline(
  trigger: SosTrigger,
  contacts: DispatchContact[],
  location?: { lat?: number; lng?: number; address?: string },
  now = new Date()
): { timeline: SosTimelineEntry[]; notifiedContactIds: string[] } {
  const at = (offsetSec: number) =>
    new Date(now.getTime() + offsetSec * 1000).toISOString();

  const timeline: SosTimelineEntry[] = [
    {
      ts: at(0),
      type: "triggered",
      label: "SOS triggered",
      detail: SOS_TRIGGER_META[trigger],
    },
    {
      ts: at(10),
      type: "countdown",
      label: "Cancel window passed",
      detail: "10-second grace period elapsed without cancellation — dispatch started",
    },
    {
      ts: at(13),
      type: "location",
      label: location?.address || location?.lat ? "Live location captured" : "Locating device",
      detail: location?.address
        ? `${location.address} — live sharing started`
        : location?.lat
          ? `Coordinates ${location.lat.toFixed(4)}, ${location.lng?.toFixed(4)} — live sharing started`
          : "Requesting device location — sharing starts as soon as a fix is available",
    },
  ];

  const sorted = [...contacts].sort((a, b) => a.priority - b.priority);
  const notifiedContactIds: string[] = [];
  sorted.forEach((c, i) => {
    const channels = [
      c.notifyBySms ? "SMS with live location link" : null,
      c.notifyByCall ? "AI voice call" : null,
    ]
      .filter(Boolean)
      .join(" + ");
    if (!channels) return;
    notifiedContactIds.push(c.id);
    timeline.push({
      ts: at(16 + i * 6),
      type: "contact_notified",
      label: `${c.name} notified`,
      detail: `Priority ${c.priority} · ${channels}`,
    });
  });

  if (sorted.some((c) => c.notifyByCall)) {
    timeline.push({
      ts: at(16 + sorted.length * 6 + 4),
      type: "ai_call",
      label: "AI emergency call in progress",
      detail:
        "The assistant relays your name, live location, and situation; it repeats until acknowledged and reports who answered",
    });
  }

  timeline.push({
    ts: at(16 + sorted.length * 6 + 10),
    type: "recording",
    label: "Evidence capture armed",
    detail: "Mobile devices begin encrypted audio/video capture when available",
  });

  if (contacts.length === 0) {
    timeline.push({
      ts: at(18),
      type: "note",
      label: "No emergency contacts configured",
      detail: "Add emergency contacts so the pipeline has someone to alert",
    });
  }

  return { timeline, notifiedContactIds };
}

export function resolutionEntry(
  status: "resolved" | "cancelled" | "false_alarm",
  now = new Date()
): SosTimelineEntry {
  const map = {
    resolved: {
      type: "resolved" as const,
      label: "Event resolved",
      detail: "All-clear sent to every notified contact",
    },
    cancelled: {
      type: "cancelled" as const,
      label: "Event cancelled",
      detail: "Cancelled by the user — notified contacts received a stand-down message",
    },
    false_alarm: {
      type: "cancelled" as const,
      label: "Marked as false alarm",
      detail: "Logged for trigger-sensitivity tuning; contacts received an all-clear",
    },
  }[status];
  return { ts: now.toISOString(), ...map };
}

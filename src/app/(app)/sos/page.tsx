import type { Metadata } from "next";
import { requireCurrentUser } from "@/lib/auth/current-user";
import {
  getActiveSosEvent,
  listEmergencyContacts,
  listSosEvents,
} from "@/lib/services/sos-service";
import { parseJson } from "@/lib/json";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SosPanel, type ActiveSosEvent } from "@/components/sos/sos-panel";
import { SosContacts } from "@/components/sos/sos-contacts";
import { SOS_STATUS_META, SOS_TRIGGER_META } from "@/lib/labels";
import type { SosStatus, SosTimelineEntry, SosTrigger } from "@/lib/types";
import { formatDateTime, formatDuration } from "@/lib/utils";
import { MapPin, Mic, Power, Smartphone, Watch } from "lucide-react";

export const metadata: Metadata = { title: "SOS Emergency" };

const TRIGGER_METHODS = [
  {
    icon: Power,
    title: "Triple power button",
    text: "Press the power button 3× within 2 seconds — works with the phone locked. Handled by the CallOlve mobile app.",
  },
  {
    icon: Watch,
    title: "Wearable",
    text: "One press on a paired smartwatch complication or BLE button triggers the same pipeline.",
  },
  {
    icon: Mic,
    title: "Voice activation",
    text: "A spoken safe-phrase during any call (or via the wake-word listener) starts a silent SOS.",
  },
  {
    icon: Smartphone,
    title: "App & dashboard",
    text: "The in-app SOS button and this dashboard trigger the identical dispatch — useful for testing.",
  },
];

export default async function SosPage() {
  const user = await requireCurrentUser();
  const [activeEventRaw, contacts, events] = await Promise.all([
    getActiveSosEvent(user.id),
    listEmergencyContacts(user.id),
    listSosEvents(user.id),
  ]);

  const activeEvent: ActiveSosEvent | null = activeEventRaw
    ? {
        id: activeEventRaw.id,
        status: activeEventRaw.status,
        startedAt: activeEventRaw.startedAt.toISOString(),
        triggerLabel: SOS_TRIGGER_META[activeEventRaw.triggerType as SosTrigger],
        address: activeEventRaw.address,
        lat: activeEventRaw.lat,
        lng: activeEventRaw.lng,
        timeline: parseJson<SosTimelineEntry[]>(activeEventRaw.timeline, []),
      }
    : null;

  const history = events.filter((e) => e.status !== "active");

  return (
    <>
      <PageHeader
        title="SOS Emergency"
        description="Personal safety pipeline: trigger, locate, alert, record — in seconds."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SosPanel activeEvent={activeEvent} />

          <Card>
            <CardHeader
              title="Trigger methods"
              subtitle="Every trigger runs the same dispatch pipeline via POST /api/v1/sos/events"
            />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              {TRIGGER_METHODS.map((m) => (
                <div key={m.title} className="rounded-xl border border-line bg-panel p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <m.icon className="size-4 text-bad" /> {m.title}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-mute">{m.text}</p>
                </div>
              ))}
              <p className="text-xs text-faint sm:col-span-2">
                Mobile and wearable triggers are provided by the CallOlve SOS app
                (Flutter) — see docs/SOS.md for the device-to-platform contract.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Safety history" subtitle="Past emergency events" />
            <CardBody>
              {history.length === 0 ? (
                <p className="text-sm text-faint">No past events — that&apos;s a good thing.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {history.map((e) => {
                    const meta = SOS_STATUS_META[e.status as SosStatus];
                    const durationSec = e.resolvedAt
                      ? Math.round((e.resolvedAt.getTime() - e.startedAt.getTime()) / 1000)
                      : null;
                    return (
                      <li key={e.id} className="flex items-center gap-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-fg">
                            {SOS_TRIGGER_META[e.triggerType as SosTrigger]}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-faint">
                            {formatDateTime(e.startedAt)}
                            {e.address ? (
                              <>
                                · <MapPin className="size-3" /> {e.address}
                              </>
                            ) : null}
                          </p>
                        </div>
                        {durationSec !== null ? (
                          <span className="text-xs text-faint">{formatDuration(durationSec)}</span>
                        ) : null}
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Emergency contacts"
              subtitle="Alerted in priority order when SOS fires"
            />
            <CardBody>
              <SosContacts
                contacts={contacts.map((c) => ({
                  id: c.id,
                  name: c.name,
                  phone: c.phone,
                  relationship: c.relationship,
                  priority: c.priority,
                  notifyBySms: c.notifyBySms,
                  notifyByCall: c.notifyByCall,
                }))}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Escalation ladder" />
            <CardBody>
              <ol className="space-y-3 text-sm">
                {[
                  ["1", "Emergency contacts", "SMS with live location + AI voice call, in priority order"],
                  ["2", "Repeat & confirm", "Unacknowledged alerts repeat; the AI reports back who confirmed"],
                  ["3", "Emergency services", "Ambulance/police routing via regional partners (architecture ready, region-dependent)"],
                ].map(([n, title, text]) => (
                  <li key={n} className="flex gap-3">
                    <span className="font-display flex size-6 shrink-0 items-center justify-center rounded-full bg-bad/10 text-xs font-bold text-bad">
                      {n}
                    </span>
                    <span>
                      <span className="block font-medium text-fg">{title}</span>
                      <span className="block text-xs text-mute">{text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

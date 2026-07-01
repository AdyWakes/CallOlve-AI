import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getCall } from "@/lib/services/call-service";
import { ApiError } from "@/lib/api";
import { parseJson } from "@/lib/json";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { CallDeleteButton } from "@/components/calls/call-delete-button";
import {
  APPOINTMENT_STATUS_META,
  CALL_STATUS_META,
  DIRECTION_META,
  INTENT_META,
  LEAD_STATUS_META,
  ORDER_STATUS_META,
  OUTCOME_META,
  SENTIMENT_META,
} from "@/lib/labels";
import type {
  AppointmentStatus,
  CallDirection,
  CallStatus,
  ExtractedAction,
  Intent,
  LeadStatus,
  OrderItem,
  OrderStatus,
  Outcome,
  Sentiment,
  TranscriptTurn,
} from "@/lib/types";
import {
  cn,
  formatDateTime,
  formatDuration,
  formatMoney,
  formatPhone,
} from "@/lib/utils";
import { CalendarCheck, Check, ShoppingBag, Star, Target, X } from "lucide-react";

export const metadata: Metadata = { title: "Call detail" };

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireCurrentUser();
  const { id } = await params;

  let call;
  try {
    call = await getCall(user.id, id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const transcript = parseJson<TranscriptTurn[]>(call.transcript, []);
  const actions = parseJson<ExtractedAction[]>(call.actions, []);
  const status = CALL_STATUS_META[call.status as CallStatus];
  const direction = DIRECTION_META[call.direction as CallDirection];
  const intent = call.intent ? INTENT_META[call.intent as Intent] : null;
  const outcome = call.outcome ? OUTCOME_META[call.outcome as Outcome] : null;
  const sentiment = call.sentiment ? SENTIMENT_META[call.sentiment as Sentiment] : null;
  const orderItems = call.order ? parseJson<OrderItem[]>(call.order.items, []) : [];

  return (
    <>
      <PageHeader
        title={call.callerName ?? formatPhone(call.callerPhone)}
        description={`${direction.label} call · ${formatDateTime(call.startedAt)} · ${formatDuration(call.durationSec)}`}
        action={<CallDeleteButton id={call.id} />}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge variant={status.variant}>{status.label}</Badge>
        {intent ? <Badge variant={intent.variant}>{intent.label}</Badge> : null}
        {outcome ? <Badge variant={outcome.variant}>{outcome.label}</Badge> : null}
        {sentiment ? <Badge variant={sentiment.variant}>Sentiment: {sentiment.label}</Badge> : null}
        {call.satisfaction ? (
          <Badge variant="warn">
            <Star className="size-3 fill-current" /> {call.satisfaction}/5
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Transcript */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Transcript"
            subtitle={
              call.assistant
                ? `Handled by ${call.assistant.name}`
                : "Assistant no longer exists"
            }
          />
          <CardBody>
            {transcript.length === 0 ? (
              <p className="text-sm text-faint">No transcript recorded for this call.</p>
            ) : (
              <div className="space-y-3">
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
                      <span className="mb-0.5 flex items-center justify-between gap-4 text-[10px] font-semibold tracking-wide uppercase opacity-60">
                        <span>
                          {t.speaker === "caller"
                            ? (call.callerName ?? "Caller")
                            : (call.assistant?.name ?? "Assistant")}
                        </span>
                        <span>{formatDuration(t.at)}</span>
                      </span>
                      {t.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="AI summary" />
            <CardBody>
              <p className="text-sm leading-relaxed text-mute">
                {call.summary ?? "No summary available."}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Actions executed" subtitle="The AI's structured work" />
            <CardBody>
              {actions.length === 0 ? (
                <p className="text-sm text-faint">No actions were extracted from this call.</p>
              ) : (
                <ul className="space-y-2.5">
                  {actions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      {a.status === "failed" ? (
                        <X className="mt-0.5 size-4 shrink-0 text-bad" />
                      ) : (
                        <Check className="mt-0.5 size-4 shrink-0 text-ok" />
                      )}
                      <span className="text-mute">{a.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {(call.appointment || call.order || call.lead) && (
            <Card className="border-brand/30">
              <CardHeader title="Created from this call" />
              <CardBody className="space-y-3">
                {call.appointment ? (
                  <Link
                    href="/appointments"
                    className="block rounded-xl border border-line bg-panel p-3.5 transition hover:border-brand/40"
                  >
                    <p className="flex items-center gap-2 text-sm font-medium text-fg">
                      <CalendarCheck className="size-4 text-brand" /> {call.appointment.service}
                    </p>
                    <p className="mt-1 text-xs text-faint">
                      {formatDateTime(call.appointment.startsAt)} ·{" "}
                      {APPOINTMENT_STATUS_META[call.appointment.status as AppointmentStatus].label}
                    </p>
                  </Link>
                ) : null}
                {call.order ? (
                  <Link
                    href="/orders"
                    className="block rounded-xl border border-line bg-panel p-3.5 transition hover:border-brand/40"
                  >
                    <p className="flex items-center gap-2 text-sm font-medium text-fg">
                      <ShoppingBag className="size-4 text-violet-300" />
                      Order · {formatMoney(call.order.totalCents)}
                    </p>
                    <p className="mt-1 text-xs text-faint">
                      {orderItems.map((i) => `${i.qty}× ${i.name}`).join(", ")} ·{" "}
                      {ORDER_STATUS_META[call.order.status as OrderStatus].label}
                    </p>
                  </Link>
                ) : null}
                {call.lead ? (
                  <Link
                    href="/leads"
                    className="block rounded-xl border border-line bg-panel p-3.5 transition hover:border-brand/40"
                  >
                    <p className="flex items-center gap-2 text-sm font-medium text-fg">
                      <Target className="size-4 text-ok" /> Lead · score {call.lead.score}
                    </p>
                    <p className="mt-1 text-xs text-faint">
                      {call.lead.interest ?? "General interest"} ·{" "}
                      {LEAD_STATUS_META[call.lead.status as LeadStatus].label}
                    </p>
                  </Link>
                ) : null}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-2.5 text-sm">
              <Row label="Caller" value={call.callerName ?? "Unknown"} />
              <Row label="Phone" value={formatPhone(call.callerPhone)} />
              <Row
                label="Assistant"
                value={
                  call.assistant ? (
                    <span className="inline-flex items-center gap-2">
                      <Avatar
                        name={call.assistant.name}
                        color={call.assistant.color}
                        className="size-5 text-[9px]"
                      />
                      {call.assistant.name}
                    </span>
                  ) : (
                    "Deleted"
                  )
                }
              />
              <Row label="Started" value={formatDateTime(call.startedAt)} />
              <Row label="Duration" value={formatDuration(call.durationSec)} />
              {call.scheduledFor ? (
                <Row label="Scheduled for" value={formatDateTime(call.scheduledFor)} />
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-mute">{label}</span>
      <span className="text-right font-medium text-fg">{value}</span>
    </div>
  );
}

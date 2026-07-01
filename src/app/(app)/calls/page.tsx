import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { listCalls } from "@/lib/services/call-service";
import { PageHeader } from "@/components/shell/page-header";
import { CallFilters } from "@/components/calls/call-filters";
import { Badge, LiveDot } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, EmptyState } from "@/components/ui/misc";
import {
  CALL_STATUS_META,
  DIRECTION_META,
  INTENT_META,
  OUTCOME_META,
} from "@/lib/labels";
import type {
  CallDirection,
  CallStatus,
  Intent,
  Outcome,
} from "@/lib/types";
import { formatDateTime, formatDuration, formatPhone } from "@/lib/utils";
import { PhoneCall, PhoneIncoming, PhoneOutgoing, Play, Star } from "lucide-react";

export const metadata: Metadata = { title: "Calls" };

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    intent?: string;
    assistantId?: string;
    q?: string;
  }>;
}) {
  const user = await requireCurrentUser();
  const filters = await searchParams;

  const [{ calls, total }, assistants] = await Promise.all([
    listCalls(user.id, filters),
    db.assistant.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const hasFilters = Boolean(filters.status || filters.intent || filters.assistantId || filters.q);

  return (
    <>
      <PageHeader
        title="Call log"
        description={`${total} call${total === 1 ? "" : "s"} across all assistants.`}
        action={
          <ButtonLink href="/simulator">
            <Play className="size-4" /> Simulate a call
          </ButtonLink>
        }
      />

      <Suspense>
        <CallFilters assistants={assistants} />
      </Suspense>

      {calls.length === 0 ? (
        <EmptyState
          icon={<PhoneCall className="size-8" />}
          title={hasFilters ? "No calls match these filters" : "No calls yet"}
          description={
            hasFilters
              ? "Try widening the filters or clearing the search."
              : "Run a simulated call to see your assistant in action — every conversation lands here."
          }
          action={
            hasFilters ? (
              <ButtonLink href="/calls" variant="secondary" size="sm">
                Clear filters
              </ButtonLink>
            ) : (
              <ButtonLink href="/simulator" size="sm">
                Open simulator
              </ButtonLink>
            )
          }
        />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <ul className="divide-y divide-line">
            {calls.map((call) => {
              const status = CALL_STATUS_META[call.status as CallStatus];
              const direction = DIRECTION_META[call.direction as CallDirection];
              const intent = call.intent ? INTENT_META[call.intent as Intent] : null;
              const outcome = call.outcome ? OUTCOME_META[call.outcome as Outcome] : null;
              return (
                <li key={call.id}>
                  <Link
                    href={`/calls/${call.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-raised/40"
                  >
                    <span className="text-faint">
                      {call.direction === "inbound" ? (
                        <PhoneIncoming className="size-4" />
                      ) : (
                        <PhoneOutgoing className="size-4" />
                      )}
                    </span>
                    <Avatar
                      name={call.callerName ?? "?"}
                      color={call.assistant?.color ?? undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fg">
                        {call.callerName ?? formatPhone(call.callerPhone)}
                      </p>
                      <p className="truncate text-xs text-faint">
                        {call.assistant?.name ?? "Deleted assistant"} · {direction.label} ·{" "}
                        {formatDateTime(call.startedAt)}
                      </p>
                    </div>
                    <div className="hidden items-center gap-2 md:flex">
                      {intent ? <Badge variant={intent.variant}>{intent.label}</Badge> : null}
                      {outcome ? <Badge variant={outcome.variant}>{outcome.label}</Badge> : null}
                    </div>
                    <Badge variant={status.variant}>
                      {call.status === "active" ? <LiveDot /> : null}
                      {status.label}
                    </Badge>
                    <span className="hidden w-12 text-right text-xs text-faint sm:block">
                      {call.durationSec ? formatDuration(call.durationSec) : "—"}
                    </span>
                    <span className="hidden w-12 items-center justify-end gap-1 text-xs text-faint lg:flex">
                      {call.satisfaction ? (
                        <>
                          <Star className="size-3 fill-warn text-warn" />
                          {call.satisfaction}
                        </>
                      ) : (
                        "—"
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

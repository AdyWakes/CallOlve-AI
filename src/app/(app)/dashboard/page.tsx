import type { Metadata } from "next";
import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getDashboardData } from "@/lib/services/dashboard-service";
import { PageHeader } from "@/components/shell/page-header";
import { Badge, LiveDot } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState, Stat } from "@/components/ui/misc";
import {
  ASSISTANT_STATUS_META,
  CALL_STATUS_META,
  DIRECTION_META,
  INTENT_META,
  ROLE_META,
} from "@/lib/labels";
import type { AssistantRole, AssistantStatus, CallStatus, Intent } from "@/lib/types";
import { formatDuration, formatPhone, relativeTime } from "@/lib/utils";
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  PhoneCall,
  PhoneMissed,
  Radio,
  ShoppingBag,
  Target,
} from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const data = await getDashboardData(user.id);
  const firstName = user.name.split(" ")[0];
  const isFresh = data.assistants.length === 0 && data.recentCalls.length === 0;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's what your AI call center has been up to."
        action={
          <>
            <ButtonLink href="/voice" variant="secondary">
              <Radio className="size-4" /> Live AI call
            </ButtonLink>
            <ButtonLink href="/assistants/new">
              <Bot className="size-4" /> New assistant
            </ButtonLink>
          </>
        }
      />

      {isFresh ? (
        <Card className="mb-6">
          <CardBody className="p-8">
            <h2 className="font-display text-lg font-semibold">
              Get your AI call center online in 3 steps
            </h2>
            <ol className="mt-5 grid gap-4 sm:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Create an assistant",
                  text: "Pick a role, personality, and voice.",
                  href: "/assistants/new",
                  cta: "Create",
                },
                {
                  step: "2",
                  title: "Run a simulated call",
                  text: "Talk to it like a real caller would.",
                  href: "/simulator",
                  cta: "Simulate",
                },
                {
                  step: "3",
                  title: "Watch the work land",
                  text: "Bookings, orders, and leads — automatically.",
                  href: "/analytics",
                  cta: "Explore",
                },
              ].map((s) => (
                <li key={s.step} className="rounded-xl border border-line bg-panel p-5">
                  <span className="font-display text-xs font-bold text-brand">STEP {s.step}</span>
                  <h3 className="mt-1.5 font-medium text-fg">{s.title}</h3>
                  <p className="mt-1 text-sm text-mute">{s.text}</p>
                  <Link
                    href={s.href}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                  >
                    {s.cta} <ArrowRight className="size-3.5" />
                  </Link>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      ) : null}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          label="Calls today"
          value={data.callsToday}
          icon={<PhoneCall className="size-4" />}
          sub={
            data.avgSatisfaction
              ? `CSAT ${data.avgSatisfaction.toFixed(1)} / 5 overall`
              : "No ratings yet"
          }
        />
        <Stat
          label="Missed today"
          value={data.missedToday}
          icon={<PhoneMissed className="size-4" />}
          sub={data.missedToday === 0 ? "Nothing slipped through" : "Follow-ups suggested"}
        />
        <Stat
          label="Upcoming appointments"
          value={data.upcomingAppointments}
          icon={<CalendarCheck className="size-4" />}
          sub="next 7 days"
        />
        <Stat
          label="Open orders"
          value={data.openOrders}
          icon={<ShoppingBag className="size-4" />}
          sub="in progress"
        />
        <Stat
          label="New leads"
          value={data.newLeads}
          icon={<Target className="size-4" />}
          sub="awaiting review"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Recent calls */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent calls"
            subtitle="Latest conversations across all assistants"
            action={
              <Link href="/calls" className="text-sm font-medium text-brand hover:underline">
                View all
              </Link>
            }
          />
          <CardBody>
            {data.recentCalls.length === 0 ? (
              <EmptyState
                icon={<PhoneCall className="size-8" />}
                title="No calls yet"
                description="Run a simulated call to see how your assistant handles real conversations."
                action={<ButtonLink href="/simulator" size="sm">Open simulator</ButtonLink>}
              />
            ) : (
              <ul className="divide-y divide-line">
                {data.recentCalls.map((call) => {
                  const status = CALL_STATUS_META[call.status as CallStatus];
                  const intent = call.intent ? INTENT_META[call.intent as Intent] : null;
                  return (
                    <li key={call.id}>
                      <Link
                        href={`/calls/${call.id}`}
                        className="flex items-center gap-4 px-1 py-3 transition hover:bg-raised/40"
                      >
                        <Avatar
                          name={call.callerName ?? "Unknown"}
                          color={call.assistant?.color ?? undefined}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-fg">
                            {call.callerName ?? formatPhone(call.callerPhone)}
                          </p>
                          <p className="truncate text-xs text-faint">
                            {call.assistant?.name ?? "Deleted assistant"} ·{" "}
                            {DIRECTION_META[call.direction as "inbound" | "outbound"].label} ·{" "}
                            {formatDuration(call.durationSec)}
                          </p>
                        </div>
                        {intent ? (
                          <Badge variant={intent.variant} className="hidden sm:inline-flex">
                            {intent.label}
                          </Badge>
                        ) : null}
                        <Badge variant={status.variant}>
                          {call.status === "active" ? <LiveDot /> : null}
                          {status.label}
                        </Badge>
                        <span className="hidden text-xs whitespace-nowrap text-faint sm:block">
                          {relativeTime(call.startedAt)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Your assistants"
              action={
                <Link href="/assistants" className="text-sm font-medium text-brand hover:underline">
                  Manage
                </Link>
              }
            />
            <CardBody>
              {data.assistants.length === 0 ? (
                <EmptyState
                  icon={<Bot className="size-8" />}
                  title="No assistants yet"
                  action={
                    <ButtonLink href="/assistants/new" size="sm">
                      Create assistant
                    </ButtonLink>
                  }
                />
              ) : (
                <ul className="space-y-3">
                  {data.assistants.map((a) => {
                    const meta = ASSISTANT_STATUS_META[a.status as AssistantStatus];
                    return (
                      <li key={a.id}>
                        <Link
                          href={`/assistants/${a.id}`}
                          className="flex items-center gap-3 rounded-lg px-1 py-1.5 transition hover:bg-raised/40"
                        >
                          <Avatar name={a.name} color={a.color} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-fg">{a.name}</p>
                            <p className="text-xs text-faint">
                              {ROLE_META[a.role as AssistantRole].label}
                            </p>
                          </div>
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Platform status" />
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-mute">Integrations connected</span>
                <span className="font-medium text-fg">{data.connectedIntegrations}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mute">Average rating</span>
                <span className="font-medium text-fg">
                  {data.avgSatisfaction ? `${data.avgSatisfaction.toFixed(1)} / 5` : "—"}
                </span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getAnalyticsOverview } from "@/lib/services/analytics-service";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Stat } from "@/components/ui/misc";
import { AreaChart, BarList, Donut, HeatStrip, Sparkline } from "@/components/charts/charts";
import { INTENT_META, OUTCOME_META } from "@/lib/labels";
import { cn, formatDuration, formatMoney } from "@/lib/utils";
import {
  BarChart3,
  CalendarCheck,
  Clock,
  DollarSign,
  PhoneCall,
  Smile,
  Target,
  TrendingUp,
} from "lucide-react";

export const metadata: Metadata = { title: "Analytics" };

const PERIODS = [7, 30, 90] as const;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const user = await requireCurrentUser();
  const { days: rawDays } = await searchParams;
  const days = PERIODS.includes(Number(rawDays) as (typeof PERIODS)[number])
    ? Number(rawDays)
    : 30;

  const data = await getAnalyticsOverview(user.id, days);
  const { kpis } = data;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Every number on this page is computed live from your call data."
        action={
          <div className="glass flex items-center gap-1 rounded-lg p-1">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={`/analytics?days=${p}`}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition",
                  p === days
                    ? "bg-brand/15 font-medium text-brand"
                    : "text-mute hover:text-fg"
                )}
              >
                {p}d
              </Link>
            ))}
          </div>
        }
      />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total calls"
          value={kpis.totalCalls}
          icon={<PhoneCall className="size-4" />}
          sub={
            kpis.callsDeltaPct !== null
              ? `${kpis.callsDeltaPct >= 0 ? "+" : ""}${kpis.callsDeltaPct}% vs previous ${days}d`
              : `last ${days} days`
          }
        />
        <Stat
          label="Answer rate"
          value={`${Math.round(kpis.answeredRate * 100)}%`}
          icon={<TrendingUp className="size-4" />}
          sub={`avg duration ${formatDuration(kpis.avgDurationSec)}`}
        />
        <Stat
          label="Conversion rate"
          value={`${Math.round(kpis.conversionRate * 100)}%`}
          icon={<Target className="size-4" />}
          sub="calls ending in a business outcome"
        />
        <Stat
          label="Caller satisfaction"
          value={kpis.avgSatisfaction ? `${kpis.avgSatisfaction} / 5` : "—"}
          icon={<Smile className="size-4" />}
          sub="post-call AI estimate"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Bookings"
          value={kpis.bookings}
          icon={<CalendarCheck className="size-4" />}
          sub="appointments created by AI"
        />
        <Stat
          label="Orders"
          value={kpis.ordersCount}
          icon={<BarChart3 className="size-4" />}
          sub="taken over the phone"
        />
        <Stat
          label="Order revenue"
          value={formatMoney(kpis.orderRevenueCents)}
          icon={<DollarSign className="size-4" />}
          sub={`last ${days} days`}
        />
        <Stat
          label="Leads captured"
          value={kpis.leadsCaptured}
          icon={<Clock className="size-4" />}
          sub="scored and routed to sales"
        />
      </div>

      {/* Volume */}
      <Card className="mt-6">
        <CardHeader
          title="Call volume"
          subtitle={`Daily calls over the last ${days} days (missed calls included)`}
        />
        <CardBody>
          <AreaChart
            points={data.volumeByDay.map((d) => ({ label: d.label, value: d.total }))}
          />
        </CardBody>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="What callers want" subtitle="Intent distribution (completed calls)" />
          <CardBody>
            {data.intents.length === 0 ? (
              <p className="text-sm text-faint">No completed calls in this period.</p>
            ) : (
              <Donut
                segments={data.intents.map((i) => ({
                  label: INTENT_META[i.intent]?.label ?? i.intent,
                  value: i.count,
                }))}
                centerValue={String(data.intents.reduce((s, i) => s + i.count, 0))}
                centerLabel="calls"
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Outcomes" subtitle="How conversations ended" />
          <CardBody>
            {data.outcomes.length === 0 ? (
              <p className="text-sm text-faint">No outcomes recorded in this period.</p>
            ) : (
              <BarList
                items={data.outcomes.map((o) => ({
                  label: OUTCOME_META[o.outcome]?.label ?? o.outcome,
                  value: o.count,
                }))}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Sentiment" subtitle="Caller mood across completed calls" />
          <CardBody>
            <BarList
              items={[
                { label: "Positive", value: data.sentiment.positive, color: "#34d399" },
                { label: "Neutral", value: data.sentiment.neutral, color: "#94a3b8" },
                { label: "Negative", value: data.sentiment.negative, color: "#f87171" },
              ]}
            />
            <div className="mt-6 border-t border-line pt-4">
              <p className="mb-2 text-xs font-medium tracking-wide text-faint uppercase">
                Satisfaction trend
              </p>
              <Sparkline points={data.satisfactionTrend} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Busiest hours" subtitle="When your phone rings most" />
          <CardBody>
            <HeatStrip hours={data.busiestHours} />
            <p className="mt-4 text-xs text-faint">
              Use this to schedule outbound follow-ups in quiet windows — the AI
              never queues outbound calls during your inbound peaks.
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

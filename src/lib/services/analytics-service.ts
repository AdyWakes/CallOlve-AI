import { db } from "@/lib/db";
import type { Intent, Outcome, Sentiment } from "@/lib/types";

/**
 * Analytics aggregations. Everything is computed from real Call/Order/Lead
 * rows — nothing is hardcoded. All date bucketing uses local server time.
 */

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface AnalyticsOverview {
  days: number;
  kpis: {
    totalCalls: number;
    callsDeltaPct: number | null; // vs previous period
    answeredRate: number; // 0..1
    avgDurationSec: number;
    bookings: number;
    ordersCount: number;
    orderRevenueCents: number;
    leadsCaptured: number;
    conversionRate: number; // calls with business outcome / completed calls
    avgSatisfaction: number | null;
  };
  volumeByDay: { label: string; total: number; missed: number }[];
  intents: { intent: Intent; count: number }[];
  outcomes: { outcome: Outcome; count: number }[];
  sentiment: Record<Sentiment, number>;
  satisfactionTrend: SeriesPoint[];
  busiestHours: { hour: number; count: number }[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getAnalyticsOverview(
  userId: string,
  days: number
): Promise<AnalyticsOverview> {
  const now = new Date();
  const since = new Date(now.getTime() - (days - 1) * DAY_MS);
  since.setHours(0, 0, 0, 0);
  const prevSince = new Date(since.getTime() - days * DAY_MS);

  const [calls, prevCallCount, orders, leadsCaptured] = await Promise.all([
    db.call.findMany({
      where: { userId, startedAt: { gte: since }, status: { in: ["completed", "missed"] } },
      select: {
        startedAt: true,
        status: true,
        durationSec: true,
        intent: true,
        outcome: true,
        sentiment: true,
        satisfaction: true,
      },
      orderBy: { startedAt: "asc" },
    }),
    db.call.count({
      where: {
        userId,
        startedAt: { gte: prevSince, lt: since },
        status: { in: ["completed", "missed"] },
      },
    }),
    db.order.findMany({
      where: { userId, createdAt: { gte: since }, status: { not: "cancelled" } },
      select: { totalCents: true },
    }),
    db.lead.count({ where: { userId, createdAt: { gte: since } } }),
  ]);

  const completed = calls.filter((c) => c.status === "completed");
  const missed = calls.filter((c) => c.status === "missed");

  // ── volume by day
  const dayBuckets = new Map<string, { label: string; total: number; missed: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * DAY_MS);
    dayBuckets.set(dayKey(d), { label: dayLabel(d, days), total: 0, missed: 0 });
  }
  for (const c of calls) {
    const bucket = dayBuckets.get(dayKey(c.startedAt));
    if (!bucket) continue;
    bucket.total++;
    if (c.status === "missed") bucket.missed++;
  }

  // ── breakdowns
  const intentCounts = new Map<string, number>();
  const outcomeCounts = new Map<string, number>();
  const sentiment: Record<Sentiment, number> = { positive: 0, neutral: 0, negative: 0 };
  const hourCounts = new Array<number>(24).fill(0);
  const satByDay = new Map<string, { sum: number; n: number; label: string }>();

  for (const c of completed) {
    if (c.intent) intentCounts.set(c.intent, (intentCounts.get(c.intent) ?? 0) + 1);
    if (c.outcome) outcomeCounts.set(c.outcome, (outcomeCounts.get(c.outcome) ?? 0) + 1);
    if (c.sentiment && c.sentiment in sentiment) sentiment[c.sentiment as Sentiment]++;
    hourCounts[c.startedAt.getHours()]++;
    if (c.satisfaction) {
      const key = dayKey(c.startedAt);
      const cur = satByDay.get(key) ?? { sum: 0, n: 0, label: dayLabel(c.startedAt, days) };
      cur.sum += c.satisfaction;
      cur.n++;
      satByDay.set(key, cur);
    }
  }

  const businessOutcomes = new Set(["booked", "order_placed", "lead_captured", "resolved"]);
  const converted = completed.filter((c) => c.outcome && businessOutcomes.has(c.outcome)).length;
  const rated = completed.filter((c) => c.satisfaction);
  const totalDuration = completed.reduce((s, c) => s + c.durationSec, 0);

  return {
    days,
    kpis: {
      totalCalls: calls.length,
      callsDeltaPct:
        prevCallCount > 0
          ? Math.round(((calls.length - prevCallCount) / prevCallCount) * 100)
          : null,
      answeredRate: calls.length > 0 ? completed.length / calls.length : 0,
      avgDurationSec: completed.length > 0 ? Math.round(totalDuration / completed.length) : 0,
      bookings: outcomeCounts.get("booked") ?? 0,
      ordersCount: orders.length,
      orderRevenueCents: orders.reduce((s, o) => s + o.totalCents, 0),
      leadsCaptured,
      conversionRate: completed.length > 0 ? converted / completed.length : 0,
      avgSatisfaction:
        rated.length > 0
          ? Math.round((rated.reduce((s, c) => s + (c.satisfaction ?? 0), 0) / rated.length) * 10) / 10
          : null,
    },
    volumeByDay: [...dayBuckets.values()],
    intents: [...intentCounts.entries()]
      .map(([intent, count]) => ({ intent: intent as Intent, count }))
      .sort((a, b) => b.count - a.count),
    outcomes: [...outcomeCounts.entries()]
      .map(([outcome, count]) => ({ outcome: outcome as Outcome, count }))
      .sort((a, b) => b.count - a.count),
    sentiment,
    satisfactionTrend: [...satByDay.values()].map((v) => ({
      label: v.label,
      value: Math.round((v.sum / v.n) * 10) / 10,
    })),
    busiestHours: hourCounts.map((count, hour) => ({ hour, count })),
    // missed is folded into volumeByDay buckets
  };
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(d: Date, days: number): string {
  if (days <= 7)
    return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

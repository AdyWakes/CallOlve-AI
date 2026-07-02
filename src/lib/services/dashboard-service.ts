import { db } from "@/lib/db";

export async function getDashboardData(userId: string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    callsToday,
    missedToday,
    assistants,
    upcomingAppointments,
    openOrders,
    newLeads,
    recentCalls,
    connectedIntegrations,
    satisfactionAgg,
  ] = await Promise.all([
    db.call.count({ where: { userId, startedAt: { gte: startOfToday } } }),
    db.call.count({
      where: { userId, status: "missed", startedAt: { gte: startOfToday } },
    }),
    db.assistant.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, role: true, status: true, color: true },
    }),
    db.appointment.count({
      where: {
        userId,
        startsAt: { gte: now, lte: weekAhead },
        status: { in: ["pending", "confirmed"] },
      },
    }),
    db.order.count({
      where: { userId, status: { in: ["new", "preparing", "ready"] } },
    }),
    db.lead.count({ where: { userId, status: "new" } }),
    db.call.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 6,
      include: { assistant: { select: { name: true, color: true } } },
    }),
    db.integration.count({ where: { userId, status: "connected" } }),
    db.call.aggregate({
      where: { userId, satisfaction: { not: null } },
      _avg: { satisfaction: true },
    }),
  ]);

  return {
    callsToday,
    missedToday,
    assistants,
    upcomingAppointments,
    openOrders,
    newLeads,
    recentCalls,
    connectedIntegrations,
    avgSatisfaction: satisfactionAgg._avg.satisfaction,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

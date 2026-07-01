import type { Metadata } from "next";
import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { listAppointments } from "@/lib/services/automation-service";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { StatusActions, type TransitionOption } from "@/components/automation/status-actions";
import { AppointmentCreateForm } from "@/components/automation/create-forms";
import { APPOINTMENT_STATUS_META } from "@/lib/labels";
import type { AppointmentStatus } from "@/lib/types";
import { formatDate, formatPhone, formatTime } from "@/lib/utils";
import { Bot, CalendarCheck } from "lucide-react";

export const metadata: Metadata = { title: "Appointments" };

function transitionsFor(status: AppointmentStatus): TransitionOption[] {
  switch (status) {
    case "pending":
      return [
        { to: "confirmed", label: "Confirm" },
        { to: "cancelled", label: "Cancel", danger: true },
      ];
    case "confirmed":
      return [
        { to: "completed", label: "Complete" },
        { to: "no_show", label: "No-show", danger: true },
        { to: "cancelled", label: "Cancel", danger: true },
      ];
    default:
      return [];
  }
}

export default async function AppointmentsPage() {
  const user = await requireCurrentUser();
  const all = await listAppointments(user.id);
  const now = Date.now();
  const upcoming = all.filter(
    (a) => a.startsAt.getTime() >= now && ["pending", "confirmed"].includes(a.status)
  );
  const past = all
    .filter((a) => a.startsAt.getTime() < now || !["pending", "confirmed"].includes(a.status))
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
    .slice(0, 25);

  return (
    <>
      <PageHeader
        title="Appointments"
        description={`${upcoming.length} upcoming · booked by your AI and your team.`}
      />
      <AppointmentCreateForm />

      <div className="space-y-6">
        <Card>
          <CardHeader title="Upcoming" subtitle="Pending and confirmed bookings" />
          <CardBody>
            {upcoming.length === 0 ? (
              <EmptyState
                icon={<CalendarCheck className="size-8" />}
                title="Nothing scheduled"
                description="Appointments booked by your assistant (or created manually) appear here."
              />
            ) : (
              <ul className="divide-y divide-line">
                {upcoming.map((a) => {
                  const meta = APPOINTMENT_STATUS_META[a.status as AppointmentStatus];
                  return (
                    <li key={a.id} className="flex flex-wrap items-center gap-4 py-3.5">
                      <div className="w-28 shrink-0 text-center">
                        <p className="font-display text-sm font-bold text-fg">
                          {formatDate(a.startsAt)}
                        </p>
                        <p className="text-xs text-faint">
                          {formatTime(a.startsAt)} · {a.durationMin}m
                        </p>
                      </div>
                      <Avatar name={a.contactName} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">{a.service}</p>
                        <p className="flex items-center gap-1.5 truncate text-xs text-faint">
                          {a.contactName} · {formatPhone(a.contactPhone)}
                          {a.callId ? (
                            <Link href={`/calls/${a.callId}`} className="inline-flex items-center gap-1 text-brand hover:underline">
                              <Bot className="size-3" /> AI-booked
                            </Link>
                          ) : null}
                        </p>
                      </div>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      <StatusActions
                        endpoint={`/api/v1/appointments/${a.id}`}
                        transitions={transitionsFor(a.status as AppointmentStatus)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="History" subtitle="Completed, cancelled, and past bookings" />
          <CardBody>
            {past.length === 0 ? (
              <p className="text-sm text-faint">No appointment history yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {past.map((a) => {
                  const meta = APPOINTMENT_STATUS_META[a.status as AppointmentStatus];
                  return (
                    <li key={a.id} className="flex items-center gap-4 py-3">
                      <div className="w-28 shrink-0 text-center">
                        <p className="text-sm text-mute">{formatDate(a.startsAt)}</p>
                        <p className="text-xs text-faint">{formatTime(a.startsAt)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-fg">{a.service}</p>
                        <p className="truncate text-xs text-faint">{a.contactName}</p>
                      </div>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

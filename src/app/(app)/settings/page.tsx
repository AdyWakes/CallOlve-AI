import type { Metadata } from "next";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { ProfileForm } from "@/components/settings/profile-form";
import { formatDate, relativeTime, titleCase } from "@/lib/utils";
import { Check } from "lucide-react";

export const metadata: Metadata = { title: "Settings" };

const PLAN_FEATURES: Record<string, string[]> = {
  free: ["1 assistant", "20 calls / month", "Call summaries"],
  starter: ["1 assistant", "100 calls / month", "Appointment booking"],
  pro: [
    "5 assistants",
    "1,000 calls / month",
    "Full automation suite",
    "Analytics & integrations",
  ],
  enterprise: ["Unlimited everything", "SSO & audit logs", "Dedicated infrastructure"],
};

export default async function SettingsPage() {
  const user = await requireCurrentUser();
  const plan = user.organization?.plan ?? "pro";

  const [teamMembers, recentActivity] = await Promise.all([
    user.organizationId
      ? db.user.findMany({
          where: { organizationId: user.organizationId },
          select: { id: true, name: true, email: true, role: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    db.auditLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <>
      <PageHeader title="Settings" description="Your account, plan, and team." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Profile" subtitle="How you appear across CallOlve" />
            <CardBody>
              <ProfileForm
                initial={{
                  name: user.name,
                  phone: user.phone ?? "",
                  timezone: user.timezone,
                  language: user.language,
                }}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Team"
              subtitle={
                user.organization
                  ? `Members of ${user.organization.name}`
                  : "Create a workspace with a company name at signup to invite teammates."
              }
            />
            <CardBody>
              {teamMembers.length === 0 ? (
                <p className="text-sm text-faint">
                  No organization yet — team management activates on company workspaces.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {teamMembers.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 py-3">
                      <Avatar name={m.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">
                          {m.name} {m.id === user.id ? <span className="text-faint">(you)</span> : null}
                        </p>
                        <p className="truncate text-xs text-faint">{m.email}</p>
                      </div>
                      <Badge variant={m.role === "owner" ? "brand" : "default"}>
                        {titleCase(m.role)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Recent activity" subtitle="Audit trail of account actions" />
            <CardBody>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-faint">No activity recorded yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {recentActivity.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-4 text-sm">
                      <span className="font-mono text-xs text-mute">{a.action}</span>
                      <span className="text-xs whitespace-nowrap text-faint">
                        {relativeTime(a.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Account" />
            <CardBody className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-mute">Email</span>
                <span className="font-medium text-fg">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mute">Role</span>
                <span className="font-medium text-fg">{titleCase(user.role)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mute">Member since</span>
                <span className="font-medium text-fg">{formatDate(user.createdAt)}</span>
              </div>
            </CardBody>
          </Card>

          <Card className="border-brand/30">
            <CardHeader
              title="Your plan"
              action={<Badge variant="brand">{titleCase(plan)}</Badge>}
            />
            <CardBody>
              <ul className="space-y-2">
                {(PLAN_FEATURES[plan] ?? PLAN_FEATURES.pro).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-mute">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" /> {f}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-faint">
                Billing management ships with the production release.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

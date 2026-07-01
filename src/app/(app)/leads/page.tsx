import type { Metadata } from "next";
import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { listLeads } from "@/lib/services/automation-service";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState, ProgressBar } from "@/components/ui/misc";
import { StatusActions, type TransitionOption } from "@/components/automation/status-actions";
import { LeadCreateForm } from "@/components/automation/create-forms";
import { LEAD_STATUS_META } from "@/lib/labels";
import type { LeadStatus } from "@/lib/types";
import { formatPhone, relativeTime, titleCase } from "@/lib/utils";
import { Bot, Target } from "lucide-react";

export const metadata: Metadata = { title: "Leads" };

function transitionsFor(status: LeadStatus): TransitionOption[] {
  switch (status) {
    case "new":
      return [
        { to: "qualified", label: "Qualify" },
        { to: "contacted", label: "Mark contacted" },
        { to: "lost", label: "Lost", danger: true },
      ];
    case "qualified":
      return [
        { to: "contacted", label: "Mark contacted" },
        { to: "converted", label: "Convert" },
        { to: "lost", label: "Lost", danger: true },
      ];
    case "contacted":
      return [
        { to: "converted", label: "Convert" },
        { to: "lost", label: "Lost", danger: true },
      ];
    default:
      return [];
  }
}

export default async function LeadsPage() {
  const user = await requireCurrentUser();
  const leads = await listLeads(user.id);
  const open = leads
    .filter((l) => ["new", "qualified", "contacted"].includes(l.status))
    .sort((a, b) => b.score - a.score);
  const closed = leads.filter((l) => ["converted", "lost"].includes(l.status)).slice(0, 25);
  const converted = leads.filter((l) => l.status === "converted").length;

  return (
    <>
      <PageHeader
        title="Leads"
        description={`${open.length} in pipeline · ${converted} converted.`}
      />
      <LeadCreateForm />

      <div className="space-y-6">
        <Card>
          <CardHeader title="Pipeline" subtitle="Sorted by AI lead score" />
          <CardBody>
            {open.length === 0 ? (
              <EmptyState
                icon={<Target className="size-8" />}
                title="No open leads"
                description="Every pricing or availability inquiry your assistant handles becomes a scored lead."
              />
            ) : (
              <ul className="divide-y divide-line">
                {open.map((l) => {
                  const meta = LEAD_STATUS_META[l.status as LeadStatus];
                  return (
                    <li key={l.id} className="flex flex-wrap items-center gap-4 py-3.5">
                      <Avatar name={l.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">{l.name}</p>
                        <p className="flex items-center gap-1.5 truncate text-xs text-faint">
                          {l.interest ?? "General inquiry"} · {formatPhone(l.phone)} ·{" "}
                          {titleCase(l.source)}
                          {l.callId ? (
                            <Link
                              href={`/calls/${l.callId}`}
                              className="inline-flex items-center gap-1 text-brand hover:underline"
                            >
                              <Bot className="size-3" /> from call
                            </Link>
                          ) : null}
                        </p>
                      </div>
                      <div className="w-28">
                        <p className="mb-1 text-right text-xs font-semibold text-fg">
                          {l.score}
                          <span className="font-normal text-faint"> /100</span>
                        </p>
                        <ProgressBar value={l.score} />
                      </div>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      <StatusActions
                        endpoint={`/api/v1/leads/${l.id}`}
                        transitions={transitionsFor(l.status as LeadStatus)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Closed" subtitle="Converted and lost" />
          <CardBody>
            {closed.length === 0 ? (
              <p className="text-sm text-faint">No closed leads yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {closed.map((l) => {
                  const meta = LEAD_STATUS_META[l.status as LeadStatus];
                  return (
                    <li key={l.id} className="flex items-center gap-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-fg">{l.name}</p>
                        <p className="truncate text-xs text-faint">
                          {l.interest ?? "General inquiry"} · {relativeTime(l.createdAt)}
                        </p>
                      </div>
                      <span className="text-xs text-faint">score {l.score}</span>
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

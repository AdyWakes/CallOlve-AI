import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getAssistant } from "@/lib/services/assistant-service";
import { ApiError } from "@/lib/api";
import { parseJson } from "@/lib/json";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { AssistantActions } from "@/components/assistants/assistant-actions";
import { AssistantEditForm } from "@/components/assistants/assistant-edit-form";
import {
  ASSISTANT_STATUS_META,
  CALL_STATUS_META,
  INTENT_META,
  ROLE_META,
} from "@/lib/labels";
import type { AssistantStatus, AssistantRole, CallStatus, Intent } from "@/lib/types";
import { formatDuration, formatPhone, relativeTime } from "@/lib/utils";
import { Brain, PhoneCall, Play } from "lucide-react";

export const metadata: Metadata = { title: "Assistant" };

export default async function AssistantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireCurrentUser();
  const { id } = await params;

  let assistant;
  try {
    assistant = await getAssistant(user.id, id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const status = ASSISTANT_STATUS_META[assistant.status as AssistantStatus];
  const memoryNotes = parseJson<string[]>(assistant.memoryNotes, []);

  return (
    <>
      <PageHeader
        title={assistant.name}
        description={`${ROLE_META[assistant.role as AssistantRole].label} · ${assistant._count.calls} calls handled`}
        action={
          <>
            <ButtonLink href={`/simulator?assistant=${assistant.id}`} variant="secondary">
              <Play className="size-4" /> Test in simulator
            </ButtonLink>
            <AssistantActions id={assistant.id} status={assistant.status} />
          </>
        }
      />

      <div className="mb-6 flex items-center gap-4">
        <Avatar name={assistant.name} color={assistant.color} className="size-14 text-base" />
        <div>
          <Badge variant={status.variant}>{status.label}</Badge>
          <p className="mt-1 text-xs text-faint">
            Created {relativeTime(assistant.createdAt)} · last updated{" "}
            {relativeTime(assistant.updatedAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Configuration" subtitle="Changes apply to the next call." />
          <CardBody>
            <AssistantEditForm
              id={assistant.id}
              initial={{
                name: assistant.name,
                role: assistant.role,
                personality: assistant.personality,
                tone: assistant.tone,
                voice: assistant.voice,
                language: assistant.language,
                greeting: assistant.greeting,
                systemPrompt: assistant.systemPrompt,
                memoryEnabled: assistant.memoryEnabled,
                color: assistant.color,
              }}
            />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Memory"
              subtitle={assistant.memoryEnabled ? "Long-term memory on" : "Memory disabled"}
            />
            <CardBody>
              {memoryNotes.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-faint">
                  <Brain className="size-4" /> Nothing remembered yet — memories accrue from
                  completed calls.
                </p>
              ) : (
                <ul className="space-y-2">
                  {memoryNotes.map((note, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-line bg-panel px-3 py-2 text-sm text-mute"
                    >
                      {note}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Recent calls"
              action={
                <Link
                  href={`/calls?assistantId=${assistant.id}`}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  All
                </Link>
              }
            />
            <CardBody>
              {assistant.calls.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-faint">
                  <PhoneCall className="size-4" /> No calls yet — try the simulator.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {assistant.calls.map((c) => {
                    const cs = CALL_STATUS_META[c.status as CallStatus];
                    const intent = c.intent ? INTENT_META[c.intent as Intent] : null;
                    return (
                      <li key={c.id}>
                        <Link
                          href={`/calls/${c.id}`}
                          className="flex items-center justify-between gap-3 py-2.5 transition hover:bg-raised/40"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm text-fg">
                              {c.callerName ?? formatPhone(c.callerPhone)}
                            </p>
                            <p className="text-xs text-faint">
                              {relativeTime(c.startedAt)} · {formatDuration(c.durationSec)}
                            </p>
                          </div>
                          <Badge variant={(intent ?? cs).variant}>
                            {(intent ?? cs).label}
                          </Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

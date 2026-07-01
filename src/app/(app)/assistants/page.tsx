import type { Metadata } from "next";
import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { listAssistants } from "@/lib/services/assistant-service";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { ASSISTANT_STATUS_META, ROLE_META, VOICE_META } from "@/lib/labels";
import type { AssistantRole, AssistantStatus, Voice } from "@/lib/types";
import { Bot, Mic, PhoneCall, Plus } from "lucide-react";

export const metadata: Metadata = { title: "Assistants" };

export default async function AssistantsPage() {
  const user = await requireCurrentUser();
  const assistants = await listAssistants(user.id);

  return (
    <>
      <PageHeader
        title="AI Assistants"
        description="Your team of configured AI personas."
        action={
          <ButtonLink href="/assistants/new">
            <Plus className="size-4" /> New assistant
          </ButtonLink>
        }
      />

      {assistants.length === 0 ? (
        <EmptyState
          icon={<Bot className="size-8" />}
          title="No assistants yet"
          description="Create your first AI assistant — pick a role, personality, and voice, then test it in the simulator."
          action={<ButtonLink href="/assistants/new">Create your first assistant</ButtonLink>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {assistants.map((a) => {
            const status = ASSISTANT_STATUS_META[a.status as AssistantStatus];
            return (
              <Link
                key={a.id}
                href={`/assistants/${a.id}`}
                className="glass group rounded-2xl p-6 transition hover:border-brand/30"
              >
                <div className="flex items-start justify-between">
                  <Avatar name={a.name} color={a.color} className="size-12 text-sm" />
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <h2 className="font-display mt-4 text-lg font-semibold group-hover:text-brand">
                  {a.name}
                </h2>
                <p className="text-sm text-mute">{ROLE_META[a.role as AssistantRole].label}</p>
                <div className="mt-5 flex items-center gap-4 border-t border-line pt-4 text-xs text-faint">
                  <span className="inline-flex items-center gap-1.5">
                    <Mic className="size-3.5" /> {VOICE_META[a.voice as Voice].label}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <PhoneCall className="size-3.5" /> {a._count.calls} calls
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

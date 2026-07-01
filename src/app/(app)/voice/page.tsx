import type { Metadata } from "next";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { llmConfigured } from "@/lib/ai/llm";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { VoiceCall } from "@/components/voice/voice-call";

export const metadata: Metadata = { title: "Live AI voice call" };

export default async function VoicePage({
  searchParams,
}: {
  searchParams: Promise<{ assistant?: string }>;
}) {
  const user = await requireCurrentUser();
  const { assistant } = await searchParams;

  const assistants = await db.assistant.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, role: true, color: true, language: true },
  });

  return (
    <>
      <PageHeader
        title="Live AI voice call"
        description="Speak to your assistant out loud — powered by GitHub Models. Every call is logged with a transcript, summary, and the records it created."
        action={
          <Badge variant={llmConfigured() ? "ok" : "warn"}>
            {llmConfigured() ? "AI brain online" : "Add GITHUB_MODELS_TOKEN"}
          </Badge>
        }
      />
      <VoiceCall assistants={assistants} llmReady={llmConfigured()} preselectId={assistant} />
    </>
  );
}

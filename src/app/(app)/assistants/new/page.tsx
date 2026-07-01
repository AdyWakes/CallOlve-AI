import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { AssistantWizard } from "@/components/assistants/assistant-wizard";

export const metadata: Metadata = { title: "New assistant" };

export default function NewAssistantPage() {
  return (
    <>
      <PageHeader
        title="Create an assistant"
        description="Configure who answers, how they sound, and what they're allowed to do."
      />
      <AssistantWizard />
    </>
  );
}

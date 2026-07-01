import type { Metadata } from "next";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shell/page-header";
import { SimulatorView } from "@/components/simulator/simulator-view";

export const metadata: Metadata = { title: "Call simulator" };

export default async function SimulatorPage({
  searchParams,
}: {
  searchParams: Promise<{ assistant?: string }>;
}) {
  const user = await requireCurrentUser();
  const { assistant } = await searchParams;

  const assistants = await db.assistant.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      role: true,
      status: true,
      color: true,
      greeting: true,
    },
  });

  return (
    <>
      <PageHeader
        title="Call simulator"
        description="Talk to your assistant exactly like a caller would — every completed call is logged with transcript, summary, and executed actions."
      />
      <SimulatorView assistants={assistants} preselectId={assistant} />
    </>
  );
}

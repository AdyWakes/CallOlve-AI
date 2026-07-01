import { errorResponse, ok, requireUserId } from "@/lib/api";
import { disconnectIntegration } from "@/lib/services/integration-service";

type Ctx = { params: Promise<{ provider: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { provider } = await params;
    return ok(await disconnectIntegration(userId, provider));
  } catch (e) {
    return errorResponse(e);
  }
}

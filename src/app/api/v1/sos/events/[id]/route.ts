import { z } from "zod";
import { errorResponse, ok, parseBody, requireUserId } from "@/lib/api";
import { getSosEvent, resolveSos } from "@/lib/services/sos-service";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  status: z.enum(["resolved", "cancelled", "false_alarm"]),
});

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    return ok(await getSosEvent(userId, id));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const input = await parseBody(req, patchSchema);
    return ok(await resolveSos(userId, id, input.status));
  } catch (e) {
    return errorResponse(e);
  }
}

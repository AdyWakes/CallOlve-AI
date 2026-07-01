import { z } from "zod";
import { CALL_STATUSES } from "@/lib/types";
import { errorResponse, ok, parseBody, requireUserId } from "@/lib/api";
import { deleteCall, getCall, updateCallStatus } from "@/lib/services/call-service";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({ status: z.enum(CALL_STATUSES) });

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    return ok(await getCall(userId, id));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const input = await parseBody(req, patchSchema);
    return ok(await updateCallStatus(userId, id, input.status));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    return ok(await deleteCall(userId, id));
  } catch (e) {
    return errorResponse(e);
  }
}

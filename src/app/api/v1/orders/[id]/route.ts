import { orderUpdateSchema } from "@/lib/types";
import { errorResponse, ok, parseBody, requireUserId } from "@/lib/api";
import { deleteOrder, updateOrder } from "@/lib/services/automation-service";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const input = await parseBody(req, orderUpdateSchema);
    return ok(await updateOrder(userId, id, input));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    return ok(await deleteOrder(userId, id));
  } catch (e) {
    return errorResponse(e);
  }
}

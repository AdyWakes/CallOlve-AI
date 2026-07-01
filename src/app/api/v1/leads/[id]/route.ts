import { leadUpdateSchema } from "@/lib/types";
import { errorResponse, ok, parseBody, requireUserId } from "@/lib/api";
import { deleteLead, updateLead } from "@/lib/services/automation-service";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const input = await parseBody(req, leadUpdateSchema);
    return ok(await updateLead(userId, id, input));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    return ok(await deleteLead(userId, id));
  } catch (e) {
    return errorResponse(e);
  }
}

import { assistantUpdateSchema } from "@/lib/types";
import { errorResponse, ok, parseBody, requireUserId } from "@/lib/api";
import {
  deleteAssistant,
  getAssistant,
  updateAssistant,
} from "@/lib/services/assistant-service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    return ok(await getAssistant(userId, id));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const input = await parseBody(req, assistantUpdateSchema);
    return ok(await updateAssistant(userId, id, input));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    return ok(await deleteAssistant(userId, id));
  } catch (e) {
    return errorResponse(e);
  }
}

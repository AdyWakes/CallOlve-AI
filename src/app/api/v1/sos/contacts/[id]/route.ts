import { emergencyContactSchema } from "@/lib/types";
import { errorResponse, ok, parseBody, requireUserId } from "@/lib/api";
import {
  deleteEmergencyContact,
  updateEmergencyContact,
} from "@/lib/services/sos-service";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const input = await parseBody(req, emergencyContactSchema.partial());
    return ok(await updateEmergencyContact(userId, id, input));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    return ok(await deleteEmergencyContact(userId, id));
  } catch (e) {
    return errorResponse(e);
  }
}

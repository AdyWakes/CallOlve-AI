import { appointmentCreateSchema } from "@/lib/types";
import { errorResponse, ok, parseBody, requireUserId } from "@/lib/api";
import { createAppointment, listAppointments } from "@/lib/services/automation-service";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const status = new URL(req.url).searchParams.get("status") ?? undefined;
    return ok(await listAppointments(userId, status));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = await parseBody(req, appointmentCreateSchema);
    return ok(await createAppointment(userId, input), 201);
  } catch (e) {
    return errorResponse(e);
  }
}

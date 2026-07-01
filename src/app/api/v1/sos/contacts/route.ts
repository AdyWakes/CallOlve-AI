import { emergencyContactSchema } from "@/lib/types";
import { errorResponse, ok, parseBody, requireUserId } from "@/lib/api";
import {
  createEmergencyContact,
  listEmergencyContacts,
} from "@/lib/services/sos-service";

export async function GET() {
  try {
    const userId = await requireUserId();
    return ok(await listEmergencyContacts(userId));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = await parseBody(req, emergencyContactSchema);
    return ok(await createEmergencyContact(userId, input), 201);
  } catch (e) {
    return errorResponse(e);
  }
}

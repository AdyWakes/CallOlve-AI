import { sosTriggerSchema } from "@/lib/types";
import { errorResponse, ok, parseBody, requireUserId } from "@/lib/api";
import { listSosEvents, triggerSos } from "@/lib/services/sos-service";

export async function GET() {
  try {
    const userId = await requireUserId();
    return ok(await listSosEvents(userId));
  } catch (e) {
    return errorResponse(e);
  }
}

/** Trigger an SOS. Called by the dashboard, the mobile app, and wearables. */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = await parseBody(req, sosTriggerSchema);
    return ok(await triggerSos(userId, input), 201);
  } catch (e) {
    return errorResponse(e);
  }
}

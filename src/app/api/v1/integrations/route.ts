import { integrationConnectSchema } from "@/lib/types";
import { errorResponse, ok, parseBody, requireUserId } from "@/lib/api";
import {
  connectIntegration,
  listIntegrations,
} from "@/lib/services/integration-service";

export async function GET() {
  try {
    const userId = await requireUserId();
    return ok(await listIntegrations(userId));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = await parseBody(req, integrationConnectSchema);
    return ok(await connectIntegration(userId, input.provider), 201);
  } catch (e) {
    return errorResponse(e);
  }
}

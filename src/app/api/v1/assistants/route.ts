import { assistantCreateSchema } from "@/lib/types";
import { errorResponse, ok, parseBody, requireUserId } from "@/lib/api";
import { createAssistant, listAssistants } from "@/lib/services/assistant-service";

export async function GET() {
  try {
    const userId = await requireUserId();
    return ok(await listAssistants(userId));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = await parseBody(req, assistantCreateSchema);
    return ok(await createAssistant(userId, input), 201);
  } catch (e) {
    return errorResponse(e);
  }
}

import { callCreateSchema, CALL_STATUSES } from "@/lib/types";
import { errorResponse, ok, parseBody, requireUserId } from "@/lib/api";
import { createCallRecord, listCalls } from "@/lib/services/call-service";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const p = url.searchParams;
    const result = await listCalls(userId, {
      status: p.get("status") ?? undefined,
      direction: p.get("direction") ?? undefined,
      intent: p.get("intent") ?? undefined,
      assistantId: p.get("assistantId") ?? undefined,
      q: p.get("q") ?? undefined,
      take: p.get("take") ? Number(p.get("take")) : undefined,
      skip: p.get("skip") ? Number(p.get("skip")) : undefined,
    });
    return ok(result);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = await parseBody(req, callCreateSchema);
    if (!CALL_STATUSES.includes(input.status)) input.status = "completed";
    return ok(await createCallRecord(userId, input), 201);
  } catch (e) {
    return errorResponse(e);
  }
}

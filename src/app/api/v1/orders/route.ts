import { orderCreateSchema } from "@/lib/types";
import { errorResponse, ok, parseBody, requireUserId } from "@/lib/api";
import { createOrder, listOrders } from "@/lib/services/automation-service";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const status = new URL(req.url).searchParams.get("status") ?? undefined;
    return ok(await listOrders(userId, status));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = await parseBody(req, orderCreateSchema);
    return ok(await createOrder(userId, input), 201);
  } catch (e) {
    return errorResponse(e);
  }
}

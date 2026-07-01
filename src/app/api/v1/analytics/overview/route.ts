import { errorResponse, ok, requireUserId } from "@/lib/api";
import { getAnalyticsOverview } from "@/lib/services/analytics-service";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const raw = Number(new URL(req.url).searchParams.get("days") ?? 30);
    const days = [7, 30, 90].includes(raw) ? raw : 30;
    return ok(await getAnalyticsOverview(userId, days));
  } catch (e) {
    return errorResponse(e);
  }
}

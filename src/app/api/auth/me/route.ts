import { db } from "@/lib/db";
import { errorResponse, ok, requireUserId, ApiError } from "@/lib/api";

export async function GET() {
  try {
    const userId = await requireUserId();
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        timezone: true,
        language: true,
        createdAt: true,
        organization: { select: { id: true, name: true, plan: true, industry: true } },
      },
    });
    if (!user) throw new ApiError(401, "Not authenticated");
    return ok(user);
  } catch (e) {
    return errorResponse(e);
  }
}

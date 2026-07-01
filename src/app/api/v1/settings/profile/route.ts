import { db } from "@/lib/db";
import { profileUpdateSchema } from "@/lib/types";
import { errorResponse, ok, parseBody, requireUserId } from "@/lib/api";

export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const input = await parseBody(req, profileUpdateSchema);
    const user = await db.user.update({
      where: { id: userId },
      data: input,
      select: { id: true, name: true, phone: true, timezone: true, language: true },
    });
    return ok(user);
  } catch (e) {
    return errorResponse(e);
  }
}

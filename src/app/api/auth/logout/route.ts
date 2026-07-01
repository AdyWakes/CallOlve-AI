import { destroySession } from "@/lib/auth/session";
import { errorResponse, ok } from "@/lib/api";

export async function POST() {
  try {
    await destroySession();
    return ok({ loggedOut: true });
  } catch (e) {
    return errorResponse(e);
  }
}

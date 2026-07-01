import { db } from "@/lib/db";
import { loginSchema } from "@/lib/types";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { ApiError, errorResponse, ok, parseBody } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const input = await parseBody(req, loginSchema);

    const user = await db.user.findUnique({ where: { email: input.email } });
    const valid = user && (await verifyPassword(input.password, user.passwordHash));
    if (!valid) {
      // Single generic message — never reveal which part was wrong
      throw new ApiError(401, "Invalid email or password");
    }

    await createSession(user);
    return ok({ id: user.id, name: user.name, email: user.email });
  } catch (e) {
    return errorResponse(e);
  }
}

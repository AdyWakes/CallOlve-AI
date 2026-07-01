import { cookies } from "next/headers";
import { z } from "zod";
import { ApiError, errorResponse, ok, parseBody } from "@/lib/api";
import { UNLOCK_COOKIE, unlockToken } from "@/lib/site-gate";

/** Verify the shared site password and set the unlock cookie. */
export async function POST(req: Request) {
  try {
    const { password } = await parseBody(req, z.object({ password: z.string() }));
    const sitePassword = process.env.SITE_PASSWORD;
    if (!sitePassword || password !== sitePassword) {
      throw new ApiError(401, "Incorrect password");
    }
    const jar = await cookies();
    jar.set(UNLOCK_COOKIE, await unlockToken(sitePassword), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
    return ok({ unlocked: true });
  } catch (e) {
    return errorResponse(e);
  }
}

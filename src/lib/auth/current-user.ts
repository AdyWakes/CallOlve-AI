import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "./session";

/**
 * Resolve the logged-in user for server components. Cached per request so
 * layout + page can both call it with a single DB hit.
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  return db.user.findUnique({
    where: { id: session.sub },
    include: { organization: true },
  });
});

/** Like getCurrentUser but redirects to login when unauthenticated. */
export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

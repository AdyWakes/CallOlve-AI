import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { UNLOCK_COOKIE, unlockToken } from "@/lib/site-gate";

const AUTH_PAGES = ["/login", "/signup"];
const APP_PREFIXES = [
  "/dashboard",
  "/assistants",
  "/calls",
  "/voice",
  "/simulator",
  "/appointments",
  "/orders",
  "/leads",
  "/analytics",
  "/integrations",
  "/settings",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) Site-wide password gate (when SITE_PASSWORD is set). Applies to pages
  //    only — API routes do their own auth (session cookie or agent token), so
  //    the phone worker and app fetches are unaffected.
  const sitePassword = process.env.SITE_PASSWORD;
  if (sitePassword && pathname !== "/unlock") {
    const expected = await unlockToken(sitePassword);
    if (req.cookies.get(UNLOCK_COOKIE)?.value !== expected) {
      const url = new URL("/unlock", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // 2) Auth gate for the dashboard.
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (AUTH_PAGES.includes(pathname)) {
    return session
      ? NextResponse.redirect(new URL("/dashboard", req.url))
      : NextResponse.next();
  }

  const isAppRoute = APP_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (isAppRoute && !session) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all pages except API routes, Next internals, and static files.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
};

import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

/** Thrown by services/routes to produce a clean HTTP error response. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(e: unknown) {
  if (e instanceof ApiError) {
    return NextResponse.json(
      { error: { message: e.message, details: e.details } },
      { status: e.status }
    );
  }
  if (e instanceof ZodError) {
    return NextResponse.json(
      { error: { message: "Validation failed", details: e.flatten().fieldErrors } },
      { status: 400 }
    );
  }
  console.error("[api] unhandled error:", e);
  return NextResponse.json(
    { error: { message: "Something went wrong" } },
    { status: 500 }
  );
}

/** Session guard for API routes. Returns the authenticated user id. */
export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Not authenticated");
  return session.sub;
}

/**
 * Like requireUserId, but also accepts a machine caller (the phone agent
 * worker) presenting `x-agent-token: <AGENT_API_TOKEN>`. The token maps to a
 * single configured account (AGENT_USER_EMAIL, default the demo user) so the
 * server-to-server worker can fetch context and persist calls without a
 * browser session. Browser callers fall through to the normal session check.
 */
export async function requireActorUserId(req: Request): Promise<string> {
  const agentToken = req.headers.get("x-agent-token");
  const configured = process.env.AGENT_API_TOKEN;
  if (agentToken && configured && agentToken === configured) {
    const email = process.env.AGENT_USER_EMAIL ?? "demo@callolve.ai";
    const user = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) throw new ApiError(401, "Agent account not found");
    return user.id;
  }
  return requireUserId();
}

/** Parse + validate a JSON request body against a Zod schema. */
export async function parseBody<S extends z.ZodTypeAny>(
  req: Request,
  schema: S
): Promise<z.infer<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
  return schema.parse(json);
}

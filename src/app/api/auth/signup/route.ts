import { db } from "@/lib/db";
import { signupSchema } from "@/lib/types";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { ApiError, errorResponse, ok, parseBody } from "@/lib/api";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "org"
  );
}

export async function POST(req: Request) {
  try {
    const input = await parseBody(req, signupSchema);

    const existing = await db.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ApiError(400, "An account with this email already exists", {
        email: ["An account with this email already exists"],
      });
    }

    const passwordHash = await hashPassword(input.password);

    const organization = input.company
      ? await db.organization.create({
          data: {
            name: input.company,
            slug: `${slugify(input.company)}-${Math.random().toString(36).slice(2, 7)}`,
          },
        })
      : null;

    const user = await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        organizationId: organization?.id,
      },
    });

    await db.auditLog.create({
      data: { userId: user.id, action: "account.created", target: user.id },
    });

    await createSession(user);
    return ok({ id: user.id, name: user.name, email: user.email }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}

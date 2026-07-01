import { db } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { toJson } from "@/lib/json";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import type { callCreateSchema } from "@/lib/types";

export interface CallFilters {
  status?: string;
  direction?: string;
  intent?: string;
  assistantId?: string;
  /** Caller name/phone search */
  q?: string;
  take?: number;
  skip?: number;
}

export async function listCalls(userId: string, filters: CallFilters = {}) {
  const where: Prisma.CallWhereInput = { userId };
  if (filters.status) where.status = filters.status;
  if (filters.direction) where.direction = filters.direction;
  if (filters.intent) where.intent = filters.intent;
  if (filters.assistantId) where.assistantId = filters.assistantId;
  if (filters.q) {
    where.OR = [
      { callerName: { contains: filters.q } },
      { callerPhone: { contains: filters.q } },
    ];
  }

  const [calls, total] = await Promise.all([
    db.call.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: Math.min(filters.take ?? 100, 200),
      skip: filters.skip ?? 0,
      include: { assistant: { select: { id: true, name: true, color: true } } },
    }),
    db.call.count({ where }),
  ]);
  return { calls, total };
}

export async function getCall(userId: string, id: string) {
  const call = await db.call.findFirst({
    where: { id, userId },
    include: {
      assistant: { select: { id: true, name: true, color: true, role: true } },
      appointment: true,
      order: true,
      lead: true,
    },
  });
  if (!call) throw new ApiError(404, "Call not found");
  return call;
}

type CreateInput = z.infer<typeof callCreateSchema>;

/** Records a call from an external source (webhook/gateway) or manual entry. */
export async function createCallRecord(userId: string, input: CreateInput) {
  if (input.assistantId) {
    const owns = await db.assistant.findFirst({
      where: { id: input.assistantId, userId },
      select: { id: true },
    });
    if (!owns) throw new ApiError(404, "Assistant not found");
  }
  const { transcript, actions, ...rest } = input;
  return db.call.create({
    data: {
      ...rest,
      userId,
      transcript: toJson(transcript),
      actions: toJson(actions),
      endedAt:
        rest.status === "completed"
          ? new Date(Date.now())
          : undefined,
    },
  });
}

export async function updateCallStatus(userId: string, id: string, status: string) {
  const existing = await db.call.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, "Call not found");
  return db.call.update({ where: { id }, data: { status } });
}

export async function deleteCall(userId: string, id: string) {
  const existing = await db.call.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, "Call not found");
  await db.call.delete({ where: { id } });
  await db.auditLog.create({
    data: { userId, action: "call.deleted", target: id },
  });
  return { deleted: true };
}

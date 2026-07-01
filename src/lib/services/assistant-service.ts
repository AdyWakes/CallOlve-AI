import { db } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { toJson } from "@/lib/json";
import type { z } from "zod";
import type { assistantCreateSchema, assistantUpdateSchema } from "@/lib/types";

type CreateInput = z.infer<typeof assistantCreateSchema>;
type UpdateInput = z.infer<typeof assistantUpdateSchema>;

export function listAssistants(userId: string) {
  return db.assistant.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { calls: true } } },
  });
}

export async function getAssistant(userId: string, id: string) {
  const assistant = await db.assistant.findFirst({
    where: { id, userId },
    include: {
      calls: {
        orderBy: { startedAt: "desc" },
        take: 5,
        select: {
          id: true,
          callerName: true,
          callerPhone: true,
          status: true,
          intent: true,
          durationSec: true,
          startedAt: true,
        },
      },
      _count: { select: { calls: true } },
    },
  });
  if (!assistant) throw new ApiError(404, "Assistant not found");
  return assistant;
}

export async function createAssistant(userId: string, input: CreateInput) {
  const assistant = await db.assistant.create({
    data: { ...input, userId },
  });
  await db.auditLog.create({
    data: { userId, action: "assistant.created", target: assistant.id },
  });
  return assistant;
}

export async function updateAssistant(userId: string, id: string, input: UpdateInput) {
  const existing = await db.assistant.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, "Assistant not found");

  const { memoryNotes, ...rest } = input;
  const assistant = await db.assistant.update({
    where: { id },
    data: {
      ...rest,
      ...(memoryNotes !== undefined ? { memoryNotes: toJson(memoryNotes) } : {}),
    },
  });
  await db.auditLog.create({
    data: { userId, action: "assistant.updated", target: id },
  });
  return assistant;
}

export async function deleteAssistant(userId: string, id: string) {
  const existing = await db.assistant.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, "Assistant not found");

  // Calls keep their history — assistantId is set null by the relation
  await db.assistant.delete({ where: { id } });
  await db.auditLog.create({
    data: { userId, action: "assistant.deleted", target: id, meta: toJson({ name: existing.name }) },
  });
  return { deleted: true };
}

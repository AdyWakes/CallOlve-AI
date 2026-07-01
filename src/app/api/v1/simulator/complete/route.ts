import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, errorResponse, ok, parseBody, requireUserId } from "@/lib/api";
import { completeCall } from "@/lib/ai/executor";
import type { ConversationState } from "@/lib/ai/engine";
import { extractedActionSchema, transcriptTurnSchema } from "@/lib/types";

const stateSchema = z.object({
  intent: z.string().nullable(),
  stage: z.string(),
  slots: z.record(z.string(), z.unknown()),
  transcript: z.array(transcriptTurnSchema).min(1),
  actions: z.array(extractedActionSchema),
  startedAtMs: z.number(),
  done: z.boolean(),
  outcome: z.string().optional(),
  lastUtterance: z.string().optional(),
});

const bodySchema = z.object({
  assistantId: z.string().min(1),
  state: stateSchema,
  callerName: z.string().trim().max(80).optional(),
  callerPhone: z.string().trim().max(24).optional(),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = await parseBody(req, bodySchema);

    const assistant = await db.assistant.findFirst({
      where: { id: input.assistantId, userId },
      select: { id: true },
    });
    if (!assistant) throw new ApiError(404, "Assistant not found");

    const result = await completeCall(
      userId,
      input.assistantId,
      input.state as ConversationState,
      { name: input.callerName, phone: input.callerPhone }
    );

    const call = await db.call.findUnique({
      where: { id: result.callId },
      include: { appointment: true, order: true, lead: true },
    });
    return ok(call, 201);
  } catch (e) {
    return errorResponse(e);
  }
}

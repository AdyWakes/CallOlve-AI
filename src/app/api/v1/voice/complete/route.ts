import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, errorResponse, ok, parseBody, requireActorUserId } from "@/lib/api";
import { completeCall } from "@/lib/ai/executor";
import type { ConversationState } from "@/lib/ai/engine";
import { extractedActionSchema, transcriptTurnSchema, INTENTS, OUTCOMES } from "@/lib/types";

/**
 * Persist a finished LLM voice call. Reuses the same executor as the
 * deterministic simulator — so the call, transcript, summary, extracted
 * actions, and the appointment/order/lead they create all land identically.
 */

const bodySchema = z.object({
  assistantId: z.string().min(1),
  transcript: z.array(transcriptTurnSchema).min(1),
  actions: z.array(extractedActionSchema).default([]),
  slots: z.record(z.string(), z.unknown()).default({}),
  intent: z.enum(INTENTS).nullable().optional(),
  outcome: z.enum(OUTCOMES).nullable().optional(),
  callerName: z.string().trim().max(80).nullable().optional(),
  callerPhone: z.string().trim().max(24).nullable().optional(),
  startedAtMs: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const userId = await requireActorUserId(req);
    const input = await parseBody(req, bodySchema);

    const assistant = await db.assistant.findFirst({
      where: { id: input.assistantId, userId },
      select: { id: true },
    });
    if (!assistant) throw new ApiError(404, "Assistant not found");

    const state: ConversationState = {
      intent: input.intent ?? null,
      stage: "ended",
      slots: input.slots as ConversationState["slots"],
      transcript: input.transcript,
      actions: input.actions,
      startedAtMs: input.startedAtMs ?? Date.now() - input.transcript.length * 8000,
      done: true,
      outcome: input.outcome ?? undefined,
    };

    const result = await completeCall(userId, input.assistantId, state, {
      name: input.callerName ?? undefined,
      phone: input.callerPhone ?? undefined,
    });

    const call = await db.call.findUnique({
      where: { id: result.callId },
      include: { appointment: true, order: true, lead: true },
    });
    return ok(call, 201);
  } catch (e) {
    return errorResponse(e);
  }
}

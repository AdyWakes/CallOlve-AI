import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, errorResponse, ok, parseBody, requireUserId } from "@/lib/api";
import {
  respond,
  startConversation,
  type AssistantPersona,
  type ConversationState,
} from "@/lib/ai/engine";
import { extractedActionSchema, transcriptTurnSchema } from "@/lib/types";
import type { Personality, Tone } from "@/lib/types";

const stateSchema = z.object({
  intent: z.string().nullable(),
  stage: z.string(),
  slots: z.record(z.string(), z.unknown()),
  transcript: z.array(transcriptTurnSchema),
  actions: z.array(extractedActionSchema),
  startedAtMs: z.number(),
  done: z.boolean(),
  outcome: z.string().optional(),
  lastUtterance: z.string().optional(),
});

const bodySchema = z.object({
  assistantId: z.string().min(1),
  state: stateSchema.optional(),
  utterance: z.string().trim().max(1000).optional(),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = await parseBody(req, bodySchema);

    const assistant = await db.assistant.findFirst({
      where: { id: input.assistantId, userId },
    });
    if (!assistant) throw new ApiError(404, "Assistant not found");

    const persona: AssistantPersona = {
      name: assistant.name,
      greeting: assistant.greeting,
      personality: assistant.personality as Personality,
      tone: assistant.tone as Tone,
    };

    // No state yet → opening turn (assistant greets)
    if (!input.state) {
      const turn = startConversation(persona);
      return ok(turn);
    }

    if (!input.utterance) throw new ApiError(400, "utterance is required after the call starts");
    const turn = respond(persona, input.state as ConversationState, input.utterance);
    return ok(turn);
  } catch (e) {
    return errorResponse(e);
  }
}

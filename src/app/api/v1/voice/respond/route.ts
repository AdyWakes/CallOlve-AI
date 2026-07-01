import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, errorResponse, ok, parseBody, requireUserId } from "@/lib/api";
import {
  initialMessages,
  llmConfigured,
  voiceTurn,
  type ChatMessage,
} from "@/lib/ai/llm";
import type { AssistantPersona } from "@/lib/ai/engine";
import type { Personality, Tone } from "@/lib/types";

/**
 * One LLM-backed voice turn. Stateless: the client passes the running message
 * history back each turn (same pattern as the deterministic simulator, but the
 * brain is GitHub Models). Returns the spoken reply plus any structured actions
 * and slots learned this turn.
 */

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string().nullable(),
  tool_calls: z.array(z.any()).optional(),
  tool_call_id: z.string().optional(),
  name: z.string().optional(),
});

const bodySchema = z.object({
  assistantId: z.string().min(1),
  messages: z.array(messageSchema).optional(),
  utterance: z.string().trim().max(1000).optional(),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    if (!llmConfigured()) {
      throw new ApiError(
        503,
        "Live AI voice needs GITHUB_MODELS_TOKEN. Add it to .env (see docs) or use the deterministic simulator."
      );
    }

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

    // First contact: greet, no model call needed.
    if (!input.messages || input.messages.length === 0) {
      const greeting =
        assistant.greeting || `Hello! This is ${assistant.name}. How can I help you today?`;
      const messages: ChatMessage[] = [
        ...initialMessages(persona, assistant.systemPrompt),
        { role: "assistant", content: greeting },
      ];
      return ok({
        reply: greeting,
        messages,
        newActions: [],
        slots: {},
        intent: null,
        outcome: null,
        done: false,
      });
    }

    if (!input.utterance) throw new ApiError(400, "utterance is required after the call starts");
    const result = await voiceTurn(input.messages as ChatMessage[], input.utterance);
    return ok(result);
  } catch (e) {
    return errorResponse(e);
  }
}

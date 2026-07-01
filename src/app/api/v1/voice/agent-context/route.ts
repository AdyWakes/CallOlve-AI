import { db } from "@/lib/db";
import { ApiError, errorResponse, ok, requireActorUserId } from "@/lib/api";
import { buildSystemPrompt } from "@/lib/ai/llm";
import type { AssistantPersona } from "@/lib/ai/engine";
import type { Personality, Tone } from "@/lib/types";

/**
 * Startup context for the phone agent worker. Given the agent token, returns
 * the assistant persona + the fully-rendered system prompt the worker should
 * seed its LLM with — so the prompt logic lives in one place (lib/ai/llm.ts)
 * and the browser and phone paths behave identically.
 *
 * Optional ?assistantId= selects a specific assistant; otherwise the first
 * active one for the agent account is used.
 */
export async function GET(req: Request) {
  try {
    const userId = await requireActorUserId(req);
    const assistantId = new URL(req.url).searchParams.get("assistantId") ?? undefined;

    const assistant = await db.assistant.findFirst({
      where: { userId, ...(assistantId ? { id: assistantId } : { status: "active" }) },
      orderBy: { createdAt: "asc" },
    });
    if (!assistant) throw new ApiError(404, "No assistant available for the agent account");

    const persona: AssistantPersona = {
      name: assistant.name,
      greeting: assistant.greeting,
      personality: assistant.personality as Personality,
      tone: assistant.tone as Tone,
    };

    return ok({
      assistantId: assistant.id,
      name: assistant.name,
      greeting:
        assistant.greeting || `Hello! This is ${assistant.name}. How can I help you today?`,
      language: assistant.language,
      voice: assistant.voice,
      systemPrompt: buildSystemPrompt(persona, assistant.systemPrompt),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

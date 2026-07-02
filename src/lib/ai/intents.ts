import type { Intent } from "@/lib/types";

/**
 * Deterministic intent detection via weighted keyword/pattern scoring.
 * In production this stage is swapped for an LLM classifier behind the same
 * signature — `detectIntent(utterance) → Intent | null`.
 */

const PATTERNS: Record<Exclude<Intent, "other">, { re: RegExp; weight: number }[]> = {
  book_appointment: [
    { re: /\b(book|reserve|reservation|appointment|appt)\b/i, weight: 3 },
    { re: /\btable\s+for\b/i, weight: 3 },
    { re: /\b(schedule|reschedule|slot)\b/i, weight: 2 },
    { re: /\b(available|availability|opening|free)\b.*\b(today|tomorrow|week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, weight: 2 },
    { re: /\b(haircut|cleaning|consultation|check.?up|viewing|tour|visit)\b/i, weight: 2 },
    { re: /\bcome\s+in\b/i, weight: 1 },
  ],
  place_order: [
    { re: /\b(order|takeout|take.?away|deliver|delivery)\b/i, weight: 3 },
    { re: /\b(i'?d like|can i get|i'?ll have|give me)\b.*\b(pizza|burger|salad|pasta|sandwich|coffee|roll|taco|bowl|wrap|sushi|noodles|fries|coke|juice)\b/i, weight: 4 },
    { re: /\b(pizza|burger|salad|pasta|sandwich|sushi|taco)\b/i, weight: 2 },
    { re: /\bmenu\b/i, weight: 1 },
  ],
  support: [
    { re: /\b(problem|issue|broken|complaint|wrong|missing|damaged|defective)\b/i, weight: 3 },
    { re: /\bnot\s+(working|arrived|received|delivered)\b/i, weight: 3 },
    { re: /\b(refund|return|exchange|replace)\b/i, weight: 3 },
    { re: /\bwhere\s+is\s+my\b/i, weight: 3 },
    { re: /\bcancel\b/i, weight: 2 },
    { re: /\bhelp\s+with\b/i, weight: 1 },
  ],
  lead_inquiry: [
    { re: /\b(price|pricing|quote|cost|how much|rates?)\b/i, weight: 3 },
    { re: /\b(interested|interest)\b/i, weight: 3 },
    { re: /\b(more (info|information)|details|brochure|demo)\b/i, weight: 2 },
    { re: /\bstill (available|for sale|on the market)\b/i, weight: 3 },
    { re: /\b(buy|purchase|invest|looking for)\b/i, weight: 2 },
  ],
  question: [
    { re: /\b(hours?|open|close[sd]?|opening|closing)\b/i, weight: 3 },
    { re: /\b(location|address|directions?|parking|where are you)\b/i, weight: 3 },
    { re: /\bdo you (have|offer|take|accept)\b/i, weight: 2 },
    { re: /\b(wifi|pets?|wheelchair|card|cash)\b/i, weight: 1 },
  ],
  emergency: [
    { re: /\b(emergency|urgent(ly)?\s+help)\b/i, weight: 5 },
    { re: /\b(hurt|injured|accident|bleeding|attack|unsafe|danger)\b/i, weight: 4 },
  ],
};

export function detectIntent(utterance: string): Intent | null {
  let best: { intent: Intent; score: number } | null = null;
  for (const [intent, patterns] of Object.entries(PATTERNS) as [
    Exclude<Intent, "other">,
    { re: RegExp; weight: number }[],
  ][]) {
    let score = 0;
    for (const { re, weight } of patterns) {
      if (re.test(utterance)) score += weight;
    }
    if (score > 0 && (!best || score > best.score)) best = { intent, score };
  }
  return best && best.score >= 2 ? best.intent : null;
}

import type { Personality, Tone } from "@/lib/types";

/**
 * Persona renderer: shapes neutral dialog lines with the assistant's
 * personality and tone. Deterministic (seeded by turn index) so simulated
 * calls are reproducible.
 */

export interface PersonaStyle {
  personality: Personality;
  tone: Tone;
}

const ACKS: Record<Personality, string[]> = {
  professional: ["Certainly.", "Of course.", "Understood."],
  friendly: ["Of course!", "Happy to help!", "Absolutely!"],
  energetic: ["Absolutely!", "You got it!", "Great choice!"],
  calm: ["Of course.", "No problem at all.", "That's perfectly fine."],
  witty: ["Consider it done.", "Say no more.", "Excellent taste."],
};

const CLOSERS: Record<Personality, string[]> = {
  professional: ["Thank you for calling. Have a good day.", "We appreciate your call. Goodbye."],
  friendly: ["Thanks so much for calling — have a wonderful day!", "It was great talking with you. Take care!"],
  energetic: ["Awesome — thanks for calling, have an amazing day!", "Perfect! Talk soon — bye!"],
  calm: ["Thank you for calling. Take care.", "Glad I could help. Have a peaceful day."],
  witty: ["My pleasure — try to have a day as good as this call. Goodbye!", "Until next time — goodbye!"],
};

export function ack(style: PersonaStyle, seed: number): string {
  const list = ACKS[style.personality];
  return list[seed % list.length];
}

export function closer(style: PersonaStyle, seed: number): string {
  const list = CLOSERS[style.personality];
  return list[seed % list.length];
}

/** Apply tone-level adjustments to a finished line. */
export function styled(style: PersonaStyle, line: string): string {
  let out = line;
  if (style.tone === "formal") {
    // Formal callers get fewer contractions
    out = out
      .replace(/\bI'll\b/g, "I will")
      .replace(/\bI'm\b/g, "I am")
      .replace(/\byou're\b/g, "you are")
      .replace(/\bcan't\b/g, "cannot");
  }
  if (style.tone === "direct") {
    // Direct tone trims pleasantry doubling
    out = out.replace(/^(Of course[.!]|Certainly\.|Absolutely!)\s+/i, "");
  }
  return out;
}

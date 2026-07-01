/**
 * Slot extraction: small deterministic parsers for the entities the dialog
 * flows need. Intentionally conservative — a wrong guess is worse than asking.
 */

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

const DAY_NAMES = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

export interface ParsedWhen {
  /** Human description as the caller said it, e.g. "tomorrow" */
  dateLabel?: string;
  timeLabel?: string;
  /** Resolved concrete date (date portion) */
  date?: Date;
  /** Minutes from midnight */
  timeMinutes?: number;
}

export function extractWhen(utterance: string, now = new Date()): ParsedWhen {
  const result: ParsedWhen = {};
  const lower = utterance.toLowerCase();

  // ── date
  if (/\btoday\b/.test(lower)) {
    result.dateLabel = "today";
    result.date = startOfDay(now);
  } else if (/\btomorrow\b/.test(lower)) {
    result.dateLabel = "tomorrow";
    result.date = startOfDay(addDays(now, 1));
  } else {
    for (let i = 0; i < DAY_NAMES.length; i++) {
      const re = new RegExp(`\\b(?:next\\s+)?(${DAY_NAMES[i]})\\b`);
      const m = lower.match(re);
      if (m) {
        const target = i;
        let delta = (target - now.getDay() + 7) % 7;
        if (delta === 0) delta = 7; // "Friday" said on Friday → next Friday
        if (/\bnext\s+/.test(m[0]) && delta < 7) delta += 0; // "next friday" ≈ upcoming friday
        result.dateLabel = m[1];
        result.date = startOfDay(addDays(now, delta));
        break;
      }
    }
  }

  // ── time: "7pm", "7:30 pm", "19:00", "noon"
  const t = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)\b/);
  const t24 = lower.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (t) {
    let h = parseInt(t[1], 10) % 12;
    if (t[3].startsWith("p")) h += 12;
    const m = t[2] ? parseInt(t[2], 10) : 0;
    result.timeMinutes = h * 60 + m;
    result.timeLabel = formatMinutes(result.timeMinutes);
  } else if (/\bnoon\b/.test(lower)) {
    result.timeMinutes = 12 * 60;
    result.timeLabel = "12:00 PM";
  } else if (t24) {
    result.timeMinutes = parseInt(t24[1], 10) * 60 + parseInt(t24[2], 10);
    result.timeLabel = formatMinutes(result.timeMinutes);
  } else if (/\b(at|around)\s+(\d{1,2})\b/.test(lower)) {
    // bare hour like "around 7" — assume business-plausible (9–20 → as said pm-ish)
    const m = lower.match(/\b(?:at|around)\s+(\d{1,2})\b/);
    if (m) {
      let h = parseInt(m[1], 10);
      if (h >= 1 && h <= 7) h += 12; // "at 7" → 7 PM more likely than 7 AM
      result.timeMinutes = h * 60;
      result.timeLabel = formatMinutes(result.timeMinutes);
    }
  } else if (/\bmorning\b/.test(lower)) {
    result.timeMinutes = 10 * 60;
    result.timeLabel = "10:00 AM";
  } else if (/\bafternoon\b/.test(lower)) {
    result.timeMinutes = 14 * 60;
    result.timeLabel = "2:00 PM";
  } else if (/\bevening\b/.test(lower)) {
    result.timeMinutes = 18 * 60;
    result.timeLabel = "6:00 PM";
  }

  return result;
}

export function extractPartySize(utterance: string): number | undefined {
  const lower = utterance.toLowerCase();
  const m =
    lower.match(/\b(?:for|party of|table for|group of)\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\b/) ??
    lower.match(/\b(\d{1,2}|two|three|four|five|six|seven|eight|nine|ten)\s+(?:people|persons|guests|of us)\b/);
  if (!m) return undefined;
  const raw = m[1];
  const n = NUMBER_WORDS[raw] ?? parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 && n <= 30 ? n : undefined;
}

export function extractPhone(utterance: string): string | undefined {
  const m = utterance.replace(/[().-]/g, " ").match(/(?:\+?\d[\s]?){7,15}/);
  if (!m) return undefined;
  const digits = m[0].replace(/\D/g, "");
  return digits.length >= 7 ? digits : undefined;
}

export function extractName(utterance: string, askedForName: boolean): string | undefined {
  const m = utterance.match(
    /\b(?:my name is|name'?s|this is|it'?s|i'?m)\s+([A-Za-z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)?)/i
  );
  if (m) return cleanName(m[1]);

  if (askedForName) {
    // Caller likely answered with just the name: "Priya" / "Priya Sharma, 555-0182"
    const stripped = utterance
      .replace(/(?:\+?\d[\s().-]?){7,15}/g, " ") // drop phone numbers
      .replace(/\b(yes|yeah|sure|ok(ay)?|please|thanks?|thank you|and|the|number|phone|is|it)\b/gi, " ")
      .replace(/[^a-zA-Z'\- ]/g, " ")
      .trim();
    const words = stripped.split(/\s+/).filter(Boolean);
    if (words.length >= 1 && words.length <= 3 && words[0].length >= 2) {
      return cleanName(words.slice(0, 2).join(" "));
    }
  }
  return undefined;
}

export interface ParsedItem {
  name: string;
  qty: number;
}

const ITEM_STOP_CHUNKS =
  /^(that'?s|that will|nothing|no\b|nope|everything|all\b|it\b|ye?s|yeah|ok(ay)?|sure|thanks?|thank you|pick\s?up|delivery|dine)/i;

/** "two margherita pizzas and a coke" → [{margherita pizza ×2}, {coke ×1}] */
export function extractItems(utterance: string): ParsedItem[] {
  const cleaned = utterance
    .toLowerCase()
    .replace(/(?:\+?\d[\s().-]?){7,15}/g, " ") // strip phone numbers
    .replace(/\b(hey|hi|hello|yeah|yes|umm?|uh|ok(ay)?|so)\b/g, " ")
    .replace(/\b(i'?d like|i want|can i (get|have)|i'?ll (have|take|get)|give me|my number is|to order|order|please|for (pickup|delivery))\b/g, " ")
    .replace(/\s+/g, " ");
  const chunks = cleaned
    .split(/(?:\band\b|,|\bplus\b|\bwith also\b)/)
    .map((c) => c.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "").trim())
    .filter(Boolean);

  const items: ParsedItem[] = [];
  for (const chunk of chunks) {
    if (ITEM_STOP_CHUNKS.test(chunk)) continue;
    const m = chunk.match(/^(?:(\d{1,2}|a|an|one|two|three|four|five|six)\s+)?(.+)$/);
    if (!m) continue;
    let name = (m[2] ?? "").replace(/[^a-z0-9' -]/g, "").trim();
    if (!name || name.length < 3) continue;
    // singularize a trailing plural-s on the last word ("pizzas" → "pizza")
    name = name.replace(/(\w+)s\b$/, (whole, stem: string) =>
      /(?:ss|us|is)$/.test(whole) ? whole : stem
    );
    const qRaw = m[1];
    const qty =
      !qRaw || qRaw === "a" || qRaw === "an"
        ? 1
        : (NUMBER_WORDS[qRaw] ?? (parseInt(qRaw, 10) || 1));
    items.push({ name, qty: Math.min(qty, 20) });
  }
  return items;
}

export function isAffirmative(utterance: string): boolean {
  return /\b(yes|yeah|yep|sure|correct|right|sounds good|perfect|confirm|please do|that works|ok(ay)?)\b/i.test(
    utterance
  );
}

export function isNegative(utterance: string): boolean {
  return /\b(no|nope|nothing|that'?s (all|it|everything)|that will be all|i'?m (good|all set)|nah|cancel)\b/i.test(
    utterance
  );
}

/** Deterministic demo price for an order item, $4.50–$18.50. */
export function priceFor(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 450 + (h % 29) * 50;
}

// ── helpers

function cleanName(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

export function formatMinutes(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

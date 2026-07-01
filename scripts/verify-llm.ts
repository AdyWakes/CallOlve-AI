/**
 * Verifies the GitHub Models brain end-to-end: real network call + tool-calling.
 * Drives a short booking conversation through the LLM adapter and checks that a
 * book_appointment action is produced and the call ends cleanly.
 *
 * Run: npx tsx scripts/verify-llm.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env into process.env (tsx doesn't auto-load it)
for (const line of readFileSync(resolve(process.cwd(), ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*?)"?\s*$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
}

async function main() {
  const { initialMessages, voiceTurn, llmConfigured } = await import("../src/lib/ai/llm");

  if (!llmConfigured()) {
    console.error("✘ GITHUB_MODELS_TOKEN not found in .env");
    process.exit(1);
  }
  console.log(`Model: ${process.env.GITHUB_MODELS_MODEL} @ ${process.env.GITHUB_MODELS_BASE_URL}\n`);

  const persona = {
    name: "Nova",
    greeting: "Thank you for calling Bella Cucina! This is Nova. How can I help you today?",
    personality: "friendly" as const,
    tone: "warm" as const,
  };
  const instructions =
    "You are the receptionist for Bella Cucina, an Italian restaurant. Book reservations by collecting party size, date, time, name, and phone number.";

  let messages = [...initialMessages(persona, instructions), { role: "assistant" as const, content: persona.greeting }];
  console.log(`  Nova: ${persona.greeting}`);

  const script = [
    "Hi, I'd like to book a table for two tomorrow at 7pm. My name is Alex Carter, number 555 222 3344.",
    "Yes, please book it.",
    "No that's everything, thanks. Bye!",
  ];

  let booked = false;
  let ended = false;
  let failures = 0;

  for (const utterance of script) {
    console.log(`  Caller: ${utterance}`);
    const turn = await voiceTurn(messages, utterance);
    messages = turn.messages;
    console.log(`  Nova: ${turn.reply}`);
    for (const a of turn.newActions) console.log(`    ⚡ action: ${a.type} — ${a.label}`);
    if (turn.newActions.some((a) => a.type === "book_appointment")) booked = true;
    if (turn.done) {
      ended = true;
      console.log(`    ✓ call ended · intent=${turn.intent} outcome=${turn.outcome}`);
      break;
    }
  }

  console.log("");
  const ok = (label: string, cond: boolean) => {
    if (cond) console.log(`  ✔ ${label}`);
    else {
      failures++;
      console.error(`  ✘ ${label}`);
    }
  };
  ok("token authenticated & model responded", true); // reaching here means calls succeeded
  ok("book_appointment action produced via tool-calling", booked);
  ok("call ended via end_call tool", ended);

  console.log(failures === 0 ? "\nLLM brain verified ✔" : `\n${failures} check(s) FAILED ✘`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("\n✘ Verification failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});

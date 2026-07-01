export {};

/**
 * Verifies the machine-auth path the phone agent worker uses: agent-token
 * authentication (no browser session) on /voice/agent-context and
 * /voice/complete. This is the Next.js half of Phase 2 — fully testable here.
 *
 * Run (server up):  E2E_BASE_URL=http://localhost:3100 npx tsx scripts/verify-agent-auth.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// read AGENT_API_TOKEN from .env
let token = "";
for (const line of readFileSync(resolve(process.cwd(), ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*AGENT_API_TOKEN\s*=\s*"?([^"]*?)"?\s*$/);
  if (m) token = m[1];
}

let failures = 0;
const check = (label: string, cond: boolean, extra?: unknown) => {
  if (cond) console.log(`  ✔ ${label}`);
  else {
    failures++;
    console.error(`  ✘ ${label}`, extra ?? "");
  }
};

async function main() {
  console.log(`Agent-auth check against ${BASE} (token ${token ? "loaded" : "MISSING"})\n`);

  // 1) no token → 401
  const noAuth = await fetch(`${BASE}/api/v1/voice/agent-context`);
  check("agent-context without token → 401", noAuth.status === 401, noAuth.status);

  // 2) with token → 200 + system prompt
  const ctxRes = await fetch(`${BASE}/api/v1/voice/agent-context`, {
    headers: { "x-agent-token": token },
  });
  const ctx = await ctxRes.json().catch(() => null);
  check("agent-context with token → 200", ctxRes.status === 200, ctx);
  check("returns an assistantId", Boolean(ctx?.data?.assistantId), ctx?.data);
  check("returns a rendered system prompt", (ctx?.data?.systemPrompt?.length ?? 0) > 50);

  if (!ctx?.data?.assistantId) return finish();

  // 3) persist a call via token (no cookie) → 201 + appointment created
  const completeRes = await fetch(`${BASE}/api/v1/voice/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-agent-token": token },
    body: JSON.stringify({
      assistantId: ctx.data.assistantId,
      transcript: [
        { speaker: "assistant", text: ctx.data.greeting, at: 0 },
        { speaker: "caller", text: "Book a table for two on Friday at 8pm, I'm Sam, 555 444 1212.", at: 7 },
        { speaker: "assistant", text: "Booked for Friday at 8pm. Anything else?", at: 14 },
        { speaker: "caller", text: "No thanks, bye.", at: 18 },
      ],
      actions: [
        {
          type: "book_appointment",
          label: "Book Table reservation Friday 8:00 PM",
          payload: { service: "Table reservation", dateLabel: "Friday", timeLabel: "8:00 PM", partySize: 2, name: "Sam", phone: "5554441212" },
          status: "executed",
        },
      ],
      slots: { name: "Sam", phone: "5554441212", service: "Table reservation" },
      intent: "book_appointment",
      outcome: "booked",
      callerName: "Sam",
      callerPhone: "5554441212",
    }),
  });
  const completed = await completeRes.json().catch(() => null);
  check("complete via agent token → 201", completeRes.status === 201, completed?.error ?? completeRes.status);
  check("appointment created from agent call", Boolean(completed?.data?.appointment), completed?.data);
  check("intent persisted", completed?.data?.intent === "book_appointment", completed?.data?.intent);

  finish();
}

function finish() {
  console.log(failures === 0 ? "\nAgent-auth path verified ✔" : `\n${failures} check(s) FAILED ✘`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("crashed:", e);
  process.exit(1);
});

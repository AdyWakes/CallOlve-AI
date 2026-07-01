/**
 * Live test of the voice HTTP path against a running server:
 * login → /voice/respond (greeting) → booking turns → /voice/complete →
 * confirm a Call + Appointment were persisted.
 *
 * Run (server must be up):  E2E_BASE_URL=http://localhost:3100 npx tsx scripts/verify-voice-e2e.ts
 */
export {};

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
let cookie = "";
let failures = 0;

function check(label: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`  ✔ ${label}`);
  else {
    failures++;
    console.error(`  ✘ ${label}`, extra ?? "");
  }
}

async function req(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const sc = res.headers.get("set-cookie");
  if (sc?.includes("callease_session=") && !sc.includes("callease_session=;")) {
    cookie = sc.match(/callease_session=[^;]+/)![0];
  }
  const json = await res.json().catch(() => null);
  return { status: res.status, data: json?.data, error: json?.error };
}

async function main() {
  console.log(`Voice E2E against ${BASE}\n`);

  await req("POST", "/api/auth/login", { email: "demo@callease.ai", password: "demo1234" });
  const assistants = await req("GET", "/api/v1/assistants");
  const nova = assistants.data?.find((a: any) => a.name === "Nova");
  check("logged in & found Nova", Boolean(nova), assistants.error);
  if (!nova) return finish();

  // greeting
  let turn = await req("POST", "/api/v1/voice/respond", { assistantId: nova.id });
  check("greeting turn", turn.status === 200 && turn.data?.messages?.length >= 2, turn.error);

  // accumulate like the browser client does
  const transcript: { speaker: string; text: string; at: number }[] = [
    { speaker: "assistant", text: turn.data.reply, at: 0 },
  ];
  let actions: any[] = [];
  const slots: Record<string, unknown> = {};
  let intent: string | null = null;
  let outcome: string | null = null;
  let at = 5;

  const script = [
    "Hi, I'd like to book a table for four tomorrow at 7pm. I'm Elena Voss, number 555 222 8899.",
    "Yes, please book it.",
    "No that's everything, thanks. Bye!",
  ];

  for (const utterance of script) {
    transcript.push({ speaker: "caller", text: utterance, at: (at += 6) });
    turn = await req("POST", "/api/v1/voice/respond", {
      assistantId: nova.id,
      messages: turn.data.messages,
      utterance,
    });
    if (turn.status !== 200) {
      check("voice/respond turn", false, turn.error);
      return finish();
    }
    transcript.push({ speaker: "assistant", text: turn.data.reply, at: (at += 6) });
    actions = actions.concat(turn.data.newActions ?? []);
    Object.assign(slots, turn.data.slots ?? {});
    intent = intent ?? turn.data.intent;
    outcome = turn.data.outcome ?? outcome;
    console.log(`  Nova: ${turn.data.reply}`);
    if (turn.data.done) break;
  }

  check("booking action captured over HTTP", actions.some((a) => a.type === "book_appointment"), actions);

  const completed = await req("POST", "/api/v1/voice/complete", {
    assistantId: nova.id,
    transcript,
    actions,
    slots,
    intent,
    outcome,
    callerName: typeof slots.name === "string" ? slots.name : undefined,
    callerPhone: typeof slots.phone === "string" ? slots.phone : undefined,
  });
  check("call persisted (201)", completed.status === 201, completed.error);
  check("appointment created in DB", Boolean(completed.data?.appointment), completed.data);
  check("intent saved as book_appointment", completed.data?.intent === "book_appointment", completed.data?.intent);

  const detail = await req("GET", `/api/v1/calls/${completed.data?.id}`);
  check("call detail retrievable with transcript", JSON.parse(detail.data?.transcript ?? "[]").length >= 4);

  finish();
}

function finish() {
  console.log(failures === 0 ? "\nVoice HTTP path verified ✔" : `\n${failures} check(s) FAILED ✘`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("crashed:", e);
  process.exit(1);
});

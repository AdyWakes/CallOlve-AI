/**
 * End-to-end API smoke test against a running server (default
 * http://localhost:3000). Exercises auth, assistants, the full simulator
 * booking flow, analytics, and integrations.
 *
 * Run: npx tsx scripts/e2e-smoke.ts
 * Requires: npm run db:seed (demo account), server running.
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

async function req(
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: any; error: any }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie?.includes("callease_session=")) {
    const match = setCookie.match(/callease_session=[^;]+/);
    if (match && !setCookie.includes("callease_session=;")) cookie = match[0];
  }
  const json = await res.json().catch(() => null);
  return { status: res.status, data: json?.data, error: json?.error };
}

async function main() {
  console.log(`E2E smoke against ${BASE}\n`);

  // ── auth
  console.log("── Auth");
  const unauthed = await req("GET", "/api/v1/calls");
  check("unauthenticated API returns 401", unauthed.status === 401, unauthed.status);

  const badLogin = await req("POST", "/api/auth/login", {
    email: "demo@callease.ai",
    password: "wrong-password",
  });
  check("wrong password rejected", badLogin.status === 401, badLogin.status);

  const login = await req("POST", "/api/auth/login", {
    email: "demo@callease.ai",
    password: "demo1234",
  });
  check("login succeeds", login.status === 200, login.error);
  check("session cookie set", cookie.length > 20);

  const me = await req("GET", "/api/auth/me");
  check("GET /me returns profile", me.data?.email === "demo@callease.ai", me.data);

  // ── assistants
  console.log("── Assistants");
  const assistants = await req("GET", "/api/v1/assistants");
  check("3 seeded assistants", assistants.data?.length === 3, assistants.data?.length);
  const nova = assistants.data?.find((a: any) => a.name === "Nova");
  check("Nova exists", Boolean(nova));

  // ── simulator: full booking flow
  console.log("── Simulator (booking flow)");
  let turn = await req("POST", "/api/v1/simulator/respond", { assistantId: nova.id });
  check("call starts with greeting", turn.data?.state?.transcript?.length === 1, turn.error);

  const callsBefore = await req("GET", "/api/v1/calls?take=1");
  const totalBefore = callsBefore.data?.total ?? 0;

  const script = [
    "Hi, I'd like to book a table for 4 tomorrow at 7pm",
    "My name is Elena Voss",
    "My number is 555 222 8899",
    "Yes, please book it",
  ];
  for (const utterance of script) {
    turn = await req("POST", "/api/v1/simulator/respond", {
      assistantId: nova.id,
      state: turn.data.state,
      utterance,
    });
    if (turn.status !== 200) break;
  }
  check("booking flow reaches wrap stage", turn.data?.state?.stage === "wrap", turn.data?.state?.stage);
  check(
    "book_appointment action queued",
    turn.data?.state?.actions?.some((a: any) => a.type === "book_appointment"),
    turn.data?.state?.actions
  );

  const completed = await req("POST", "/api/v1/simulator/complete", {
    assistantId: nova.id,
    state: turn.data.state,
  });
  check("call persists", completed.status === 201, completed.error);
  check("appointment created from call", Boolean(completed.data?.appointment), completed.data);
  check("intent recorded", completed.data?.intent === "book_appointment", completed.data?.intent);
  check("outcome booked", completed.data?.outcome === "booked", completed.data?.outcome);

  const callsAfter = await req("GET", "/api/v1/calls?take=1");
  check("call count incremented", (callsAfter.data?.total ?? 0) === totalBefore + 1);

  const detail = await req("GET", `/api/v1/calls/${completed.data.id}`);
  check("call detail has transcript", JSON.parse(detail.data?.transcript ?? "[]").length >= 9);

  // ── analytics
  console.log("── Analytics");
  const analytics = await req("GET", "/api/v1/analytics/overview?days=30");
  check("KPIs computed", (analytics.data?.kpis?.totalCalls ?? 0) > 50, analytics.data?.kpis);
  check("volume series spans 30 days", analytics.data?.volumeByDay?.length === 30);
  check("intent breakdown present", (analytics.data?.intents?.length ?? 0) >= 4);

  // ── integrations
  console.log("── Integrations");
  const integrations = await req("GET", "/api/v1/integrations");
  check("12 providers in registry", integrations.data?.length === 12, integrations.data?.length);
  await req("POST", "/api/v1/integrations", { provider: "hubspot" });
  const after = await req("GET", "/api/v1/integrations");
  check(
    "hubspot connects",
    after.data?.find((i: any) => i.provider === "hubspot")?.status === "connected"
  );
  await req("DELETE", "/api/v1/integrations/hubspot");
  const after2 = await req("GET", "/api/v1/integrations");
  check(
    "hubspot disconnects",
    after2.data?.find((i: any) => i.provider === "hubspot")?.status === "disconnected"
  );

  // ── validation
  console.log("── Validation");
  const bad = await req("POST", "/api/v1/assistants", { name: "" });
  check("invalid body → 400 with details", bad.status === 400 && Boolean(bad.error?.details), bad);

  console.log(
    failures === 0 ? "\nAll E2E checks passed ✔" : `\n${failures} E2E check(s) FAILED ✘`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("E2E run crashed:", e);
  process.exit(1);
});

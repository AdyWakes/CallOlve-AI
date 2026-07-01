import { NextResponse } from "next/server";

/**
 * Telephony webhook stub (Twilio / Vapi / Retell).
 *
 * Production flow: verify the provider signature, then translate call events
 * into the same Call payload the simulator produces and hand them to
 * call-service. Until a provider is configured, this logs and acknowledges so
 * end-to-end wiring can be tested with curl.
 */
export async function POST(req: Request) {
  const payload = await req.json().catch(() => ({}));
  console.log("[webhook:telephony] received event:", JSON.stringify(payload).slice(0, 500));

  return NextResponse.json({
    received: true,
    note: "Telephony webhook stub — configure TWILIO_* env vars to activate live call handling.",
  });
}

import { NextResponse } from "next/server";

/**
 * Messaging webhook stub (WhatsApp / Telegram / SMS inbound).
 *
 * Production flow: verify signature → resolve the user by channel identity →
 * feed the message into the conversation engine (same contract as voice) →
 * reply via the channel's messaging adapter.
 */
export async function POST(req: Request) {
  const payload = await req.json().catch(() => ({}));
  console.log("[webhook:messaging] received message:", JSON.stringify(payload).slice(0, 500));

  return NextResponse.json({
    received: true,
    note: "Messaging webhook stub — connect a messaging provider to activate.",
  });
}

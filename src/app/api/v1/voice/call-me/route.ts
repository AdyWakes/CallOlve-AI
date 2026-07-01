import { z } from "zod";
import { cookies } from "next/headers";
import { ApiError, errorResponse, ok, parseBody } from "@/lib/api";
import { UNLOCK_COOKIE, unlockToken } from "@/lib/site-gate";

/**
 * "Call me" — places an outbound call to a visitor's number and bridges it into
 * the LiveKit room where the cloud agent answers. Same mechanism as the
 * place_call.py script, exposed to the web so testers can request a demo call.
 *
 * Gated by the site unlock cookie (when SITE_PASSWORD is set) to prevent abuse.
 */

const bodySchema = z.object({ phone: z.string().trim().min(8).max(20) });

export async function POST(req: Request) {
  try {
    // Only allow callers who have passed the site password gate.
    const sitePassword = process.env.SITE_PASSWORD;
    if (sitePassword) {
      const jar = await cookies();
      if (jar.get(UNLOCK_COOKIE)?.value !== (await unlockToken(sitePassword))) {
        throw new ApiError(401, "Please unlock the site first.");
      }
    }

    const { phone } = await parseBody(req, bodySchema);
    const to = phone.startsWith("+") ? `+${phone.slice(1).replace(/\D/g, "")}` : `+${phone.replace(/\D/g, "")}`;
    if (!/^\+\d{8,15}$/.test(to)) {
      throw new ApiError(400, "Enter your number in international format, e.g. +91 98XXXXXXXX");
    }

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    const sipHost = process.env.LIVEKIT_SIP_HOST;
    if (!sid || !token || !from || !sipHost) {
      throw new ApiError(503, "Calling isn't configured on the server yet.");
    }

    const twiml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      `<Response><Dial answerOnBridge="true"><Sip>sip:${from}@${sipHost}</Sip></Dial></Response>`;

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Twiml: twiml }),
    });
    const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };

    if (!res.ok) {
      // Surface Twilio's reason (e.g. unverified number on a trial account).
      throw new ApiError(400, data.message ?? "Twilio could not place the call.");
    }
    return ok({ sid: data.sid, to });
  } catch (e) {
    return errorResponse(e);
  }
}

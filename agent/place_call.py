"""
Place an OUTBOUND call: the assistant rings a phone you choose and talks to
whoever answers. Reuses the existing LiveKit inbound trunk + dispatch rule —
no extra setup beyond what setup_sip.py already created.

How it works:
    Twilio REST API → rings TARGET number → on answer, TwiML bridges the call
    into LiveKit (sip:<your Twilio #>@<your LiveKit SIP host>) → the same
    `callease-phone` agent worker is dispatched and talks.

Requirements:
    - The agent worker must be running:  python agent.py dev
    - The Next.js app must be running:    npm run dev   (so the call is saved)
    - TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER in ../.env
    - Trial Twilio: the TARGET number must be a *Verified Caller ID*, and
      Voice Geo Permissions must allow the destination country (e.g. India).

Run:
    python place_call.py +9198XXXXXXXX
    # or just `python place_call.py` and enter the number when prompted
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
FROM = os.environ.get("TWILIO_PHONE_NUMBER", "")


def sip_host() -> str:
    explicit = os.environ.get("LIVEKIT_SIP_HOST")
    if explicit:
        return explicit
    # Derive from LIVEKIT_URL: wss://<proj>.livekit.cloud -> <proj>.sip.livekit.cloud
    url = os.environ.get("LIVEKIT_URL", "")
    host = url.split("://")[-1].strip("/")
    return host.replace(".livekit.cloud", ".sip.livekit.cloud")


def main() -> None:
    if not (SID and TOKEN and FROM):
        print("Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER in .env")
        sys.exit(1)

    target = sys.argv[1] if len(sys.argv) > 1 else input("Number to call (E.164, e.g. +9198XXXXXXXX): ").strip()
    if not target.startswith("+"):
        print("Use E.164 format with a country code, e.g. +919812345678")
        sys.exit(1)

    host = sip_host()
    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<Response><Dial answerOnBridge="true">'
        f"<Sip>sip:{FROM}@{host}</Sip>"
        "</Dial></Response>"
    )

    print(f"Calling {target} from {FROM}, bridging into {host} ...")
    r = httpx.post(
        f"https://api.twilio.com/2010-04-01/Accounts/{SID}/Calls.json",
        auth=(SID, TOKEN),
        data={"To": target, "From": FROM, "Twiml": twiml},
        timeout=20,
    )
    if r.status_code in (200, 201):
        sid = r.json().get("sid")
        print(f"[OK] Call initiated (Twilio Call SID: {sid}). Your phone should ring shortly.")
        print("Make sure `python agent.py dev` and `npm run dev` are running.")
    else:
        print(f"[X] Twilio rejected the call ({r.status_code}):")
        print(r.text[:600])
        print("\nCommon trial causes: target not a Verified Caller ID, or the")
        print("destination country isn't enabled in Voice > Geo Permissions.")


if __name__ == "__main__":
    main()

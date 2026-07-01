"""
One-time LiveKit SIP setup for inbound phone calls.

Creates:
  1. an inbound SIP trunk that accepts calls to your Twilio number, and
  2. a dispatch rule that drops each inbound call into its own room and
     dispatches the `callease-phone` agent worker to it.

Run once (after pip install -r requirements.txt):
    python setup_sip.py

Re-running is safe-ish but may create duplicates — list/delete with the LiveKit
CLI (`lk sip inbound list`, `lk sip dispatch list`) if you need to clean up.

NOTE: LiveKit's SIP API surface changes between releases. If a name below
doesn't match your installed `livekit-api`, check the current LiveKit telephony
docs (https://docs.livekit.io/sip/) — the concepts (inbound trunk + dispatch
rule + agent dispatch) are stable even when the exact fields move.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
from livekit import api

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "+19728127417")
AGENT_NAME = "callease-phone"


async def main() -> None:
    lk = api.LiveKitAPI()  # reads LIVEKIT_URL / API_KEY / API_SECRET from env
    try:
        # 1) Inbound trunk — accept calls addressed to our number.
        trunk = await lk.sip.create_inbound_trunk(
            api.CreateSIPInboundTrunkRequest(
                trunk=api.SIPInboundTrunkInfo(
                    name="CallOlve inbound",
                    numbers=[PHONE_NUMBER],
                )
            )
        )
        print(f"[OK] Inbound trunk created: {trunk.sip_trunk_id}")

        # 2) Dispatch rule — new room per call + dispatch the agent worker.
        rule = await lk.sip.create_dispatch_rule(
            api.CreateSIPDispatchRuleRequest(
                trunk_ids=[trunk.sip_trunk_id],
                rule=api.SIPDispatchRule(
                    dispatch_rule_individual=api.SIPDispatchRuleIndividual(
                        room_prefix="call-",
                    )
                ),
                room_config=api.RoomConfiguration(
                    agents=[api.RoomAgentDispatch(agent_name=AGENT_NAME)],
                ),
            )
        )
        print(f"[OK] Dispatch rule created: {rule.sip_dispatch_rule_id}")
        print("\nLiveKit SIP is ready. Your LiveKit SIP host is shown in the")
        print("LiveKit dashboard (Settings → SIP). Point Twilio at it (see")
        print("docs/PHONE-AGENT.md), start the worker with `python agent.py dev`,")
        print(f"then call {PHONE_NUMBER}.")
    finally:
        await lk.aclose()


if __name__ == "__main__":
    asyncio.run(main())

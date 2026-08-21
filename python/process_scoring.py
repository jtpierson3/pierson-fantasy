"""
Scoring pipeline trigger.

Runs the full scoring pass: Pass 1 (2.5 hours after kickoff) for newly 
finished fixtures, Pass 2 (48 hours after a gameweek's last kickoff) as 
a correctoin check, and lineup resolution of any gameweek touched by
either pass. All timing/eligibility logic lives in the route itself -
this script just pings it on a schedule
"""

import os
import sys
import requests

APP_URL = os.environ.get("APP_URL", "https://pierson-fantasy.vercel.app")
SYNC_SECRET = os.environ.get("SYNC_SECRET")
VERCEL_BYPASS_SECRET = os.environ.get("VERCEL_BYPASS_SECRET")

def run_process_scoring() -> dict:
    if not SYNC_SECRET or not VERCEL_BYPASS_SECRET:
        raise RuntimeError("SYNC_SECRET or VERCEL_BYPASS_SECRET is not set")

    response = requests.post(
        f"{APP_URL}/api/sync/scoring/process-scoring",
        headers={
            "Authorization": f"Bearer {SYNC_SECRET}",
            "x-vercel-production-bypass": VERCEL_BYPASS_SECRET,
            "User-Agent": "Mozilla/5.0 (compatible; PiersonFantasyScoring/1.0)",
        },
        timeout=120,
    )
    response.raise_for_status()
    return response.json()

if __name__ == "__main__":
    try:
        result = run_process_scoring()
        print(result)
    except Exception as err:
        print(f"Scoring pipeline failed: {err}", file=sys.stderr)
        sys.exit(1)
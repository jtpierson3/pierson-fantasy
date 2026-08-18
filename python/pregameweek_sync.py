"""
Pre-gameweek sync trigger

Checks wheter we're currently within the 24-hour window before the next upcoming Gameweek's
first fixture, and if so - and we haven't already synced for this particular gameweek - 
triggers the real players sync ( Which also syncs sidelined injuries/suspensions in the same pass).

This script is intentionally thin: the actual timing logic lives in should-run-pregame-sync/route.ts,
and the actual sync logic lives in sync/players/route.ts. This script just checks the first, then calls
the second if appropriate.
"""

import os
import sys
import requests

APP_URL = os.environ.get("APP_URL", "https://pierson-fantasy.vercel.app")
SYNC_SECRET = os.environ.get("SYNC_SECRET")
VERCEL_BYPASS_SECRET = os.environ.get("VERCEL_BYPASS_SECRET")

def headers() -> dict:
    return {
        "Authorization": f"Bearer {SYNC_SECRET}",
        "x-vercel-protection-bypass": VERCEL_BYPASS_SECRET,
        "User-Agent": "Mozilla/5.0 (compatible; PiersonFantasyPreGameweekSync/1.0)"
    }

def run() -> dict: 
    if not SYNC_SECRET or not VERCEL_BYPASS_SECRET:
        raise RuntimeError("SYNC_SECRET or VERCEL_BYPASS_SECRET is not set")

    check = requests.get(
        f"{APP_URL}/api/sync/should-run-pregameweek-sync",
        headers=headers(),
        timeout=30,
    )
    check.raise_for_status()
    check_result = check.json()

    if not check_result.get("shouldRun"):
        return {"ran": False, "reason": "Not within the gameweek sync window"}

    gameweek_number = check_result.get("gameweekNumber")

    sync = requests.post(
        f'{APP_URL}/api/sync/players',
        headers=headers(),
        json={"triggeredBySource": f"pregameweek-{gameweek_number}"},
        timeout=120,
    )
    sync.raise_for_status()

    return {"ran": True, "gameweekNumber": gameweek_number, "SyncResult": sync.json()}

if __name__ == "__main__":
    try:
        result = run()
        print(result)
    except Exception as err:
        print(f"Pre-gameweek sync-failed: {err}", file=sys.stderr)
        sys.exit(1)
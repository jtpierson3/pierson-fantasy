"""
Waiver processing trigger.

This script is intentionally thin - all the waiver resolution logic
lives in the Next.js app (lib/waiverProcessing.ts), since that's where
the business logic is already implemented, tested, and kept in sync with
the rest of the app's data model.

This script's only job: ping the processing endpoint on a schedule.
The endpoint itstelf checks whether the waiver window is actually closed
and no-ops if it's still open, so it's safe to call this frequently.
"""

import os
import sys
import requests

APP_URL = os.environ.get("APP_URL", "https://pierson-fantasy.vercel.app")
SYNC_SECRET = os.environ.get("SYNC_SECRET")

def process_waivers() -> dict:
    if not SYNC_SECRET:
        raise RuntimeError("SYNC_SECRET environment variable is not set")
    
    response = requests.post(
        f"{APP_URL}/api/waivers/process",
        headers={"Authorization": f"Bearer {SYNC_SECRET}"},
        timeout=30,
    )

    response.raise_for_status()
    return response.json()

if __name__ == "__main__":
    try:
        result = process_waivers()
        print(result)
    except Exception as err:
        print(f"Waiver processing failed: {err}", file=sys.stderr)
        sys.exit(1)
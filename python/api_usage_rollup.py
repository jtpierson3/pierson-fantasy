"""
API Usage Rollup Trigger

Aggregates ApiCallLog rows older than the retention window into ApiUsageMonthlySummary,
then deletes the raw rows. The actual aggregation of logic lives in lib/apiUsageRollup.ts -
this script just pings the endpoint on a schedule
"""

import os
import sys
import requests

APP_URL = os.environ.get("APP_URL", "https://pierson-fantasy.vercel.app")
SYNC_SECRET = os.environ.get("SYNC_SECRET")
VERCEL_BYPASS_SECRET = os.environ.get("VERCEL_BYPASS_SECRET")

def run_rollup() -> dict: 
    if not SYNC_SECRET:
        raise RuntimeError("SYNC_SECRET environment variable is not set")
    if not VERCEL_BYPASS_SECRET:
        raise RuntimeError("VERCEL_BYPASS_SECRET environment variable is not set")

    response = requests.post(
        f"{APP_URL}/api/admin/api-usage/rollup",
        headers={
            "Authorization": f"Bearer {SYNC_SECRET}",
            "x-vercel-protection-bypass": VERCEL_BYPASS_SECRET,
            "User-Agent": "Mozilla/5.0 (compatible; PiersonFantasyRollup/1.0)",
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()

if __name__ == "__main__":
    try:
        result = run_rollup()
        print(result)
    except Exception as err: 
        print(f"Rollup failed: {err}", file=sys.stderr)
        sys.exit(1)
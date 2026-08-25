---
name: verify-sportmonks-shape
description: Fetch and inspect a real Sportmonks API response before writing or trusting parsing code that reads from it in pierson-fantasy. Use this whenever the user is adding a new Sportmonks integration point, adding a new field to sync, debugging why a synced value is null/wrong/missing, or writing/reviewing code that parses a Sportmonks response (lib/sportmonks.ts, app/api/sync/*, python/*_sync.py). This project has repeatedly shipped bugs from assumed field names and include paths (e.g. detailedPosition vs detailed_position) that turned out to differ from what the real API actually returns — this skill exists to catch that before the code is written, not after.
---

# Verify Sportmonks Shape

## Why this exists

`lib/sportmonks.ts` and the sync routes/scripts that use it define TypeScript types and parsing
logic for Sportmonks API responses. More than once, an assumed field name or `include` path
(camelCase vs snake_case, a nested path that didn't include what was expected) turned out to be
subtly wrong, and the bug wasn't caught until real data flowed through it — real debugging time
lost to something a single API call would have caught immediately. The rule from `AGENTS.md`:
**always verify field names/response shapes against a real API response before writing parsing
code.** This skill is that verification step, made easy to actually do.

## What to do

1. **Figure out the exact endpoint and `include` path** the user needs to check. Look at
   `lib/sportmonks.ts` for existing patterns (base URL is
   `https://api.sportmonks.com/v3/football`, `LEAGUE_ID = 8`) — if this is a new field on an
   existing endpoint, find the endpoint already in use nearby. If genuinely new territory, the
   Sportmonks docs are the source for the endpoint path, but the actual field *shape* still needs
   verifying against a live call, not just the docs — docs and reality have diverged before here.

2. **Run the bundled fetch script** against that endpoint:
   ```bash
   npx tsx .claude/skills/verify-sportmonks-shape/scripts/fetch_sportmonks_example.ts <endpoint> [include]
   ```
   Example: `npx tsx .claude/skills/verify-sportmonks-shape/scripts/fetch_sportmonks_example.ts /fixtures/18528480 lineups.details;events`

   This prints the full real response plus a top-level key list, so you can see the actual field
   names (casing, nesting, presence/absence) rather than guessing. It does not write anything and
   is not part of the tracked sync pipeline — see the script's header comment about API quota
   usage (use it sparingly, one call per shape you need, not in a loop).

3. **Compare the real response against whatever type/parsing code you're about to write or
   review.** Specifically check for:
   - Casing mismatches (`detailedPosition` vs `detailed_position` vs `detailedposition`) — this
     exact class of bug has happened before.
   - Whether a field the code assumes is always present is actually nullable/absent in some
     records (e.g. a substitute's `positionPlayedId`, a fixture without lineup data yet).
   - Whether the `include` path you're using actually returns the nested data you expect, or
     whether it needs a different/deeper include chain.

4. **Only after confirming the real shape**, write or fix the TypeScript type / parsing logic in
   `lib/sportmonks.ts` (or the sync route/script consuming it) to match what the API actually
   returns — not what seemed reasonable to assume.

5. If the discrepancy explains a bug the user was debugging, say so explicitly and point at the
   specific field/line — this is often the actual root cause of "why is this value wrong/null,"
   not a downstream calculation bug.

## What NOT to do

- Don't skip the live call and write parsing code from memory/docs alone for anything
  non-trivial — that's the exact failure mode this skill exists to prevent.
- Don't loop the fetch script over many records "just to be safe" — one representative example is
  normally enough to see the shape, and each call costs real API quota.
- Don't wire the fetch script into the tracked sync pipeline or have it call `logApiCall()` — it's
  a manual diagnostic tool, kept deliberately separate from production sync code.

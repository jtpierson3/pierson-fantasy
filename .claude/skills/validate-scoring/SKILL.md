---
name: validate-scoring
description: Diagnose the automated fantasy football scoring pipeline in pierson-fantasy by comparing it against the manually-entered gameweek scores, without changing anything. Use this whenever the user wants to check, verify, validate, or debug scoring for a gameweek, asks whether the automated scoring matches what they entered manually, mentions PlayerFixturePoints, resolvedPlayerId, scoringCalculation, or finalize-week discrepancies, or is generally trying to build confidence in the automated scoring pipeline before turning it on. This is a read-only diagnostic tool — it must never write scores, flip the pipeline over to automated mode, or modify finalize-week; that switch only happens when the user explicitly says the automated path is trusted.
---

# Validate Scoring

## Why this exists

pierson-fantasy currently runs two scoring paths side by side:

- **Manual (live today):** `FantasyMatchup.homePoints` / `awayPoints` are set by hand and consumed
  by `app/api/admin/league/matchups/finalize-week/route.ts` to update standings.
- **Automated (being validated):** `PlayerMatchStats.positionPlayedId` feeds
  `lib/scoringCalculation.ts`, which produces `PlayerFixturePoints` per player per fixture.
  `GameweekLineupPlayer.resolvedPlayerId` (set only on `STARTER` rows, after auto-substitution
  resolution) identifies which player's points actually count for a given lineup slot that
  gameweek.

The user is intentionally keeping the manual path live until the automated path has been proven
correct across enough gameweeks. This skill's job is to help build that confidence by surfacing
discrepancies clearly — it is a comparison tool, not a fix-it tool. Don't "helpfully" update
`homePoints`/`awayPoints`, don't touch `finalize-week`, and don't suggest switching the pipeline
over — that decision belongs to the user alone. See `AGENTS.md` for the fuller picture of this
two-step pipeline.

## What to do

1. **Run the unit tests for the scoring/lineup logic first.** These catch algorithmic bugs
   (wrong point values, bad slot assignment) before you even look at real data:
   ```bash
   npx vitest run lib/scoringCalculation.test.ts lib/autoSubstitution.test.ts lib/lineupAssignment.test.ts
   ```
   Report any failures plainly — a failing test here is a real bug in the calculation logic
   itself, independent of any specific gameweek's data.

2. **Run the gameweek comparison script** against real data for the gameweek(s) the user cares
   about. Find the `FantasyGameweek.id` first if the user only gave you a gameweek number or
   league name (query via prisma, or ask the user for the id if it's ambiguous which league).
   ```bash
   npx tsx .claude/skills/validate-scoring/scripts/compare_gameweek_scoring.ts <fantasyGameweekId>
   ```
   This script (`scripts/compare_gameweek_scoring.ts`) is read-only: for each `FantasyMatchup` in
   the gameweek, it sums `PlayerFixturePoints.points` for each lineup's resolved starters and
   compares that total against the manually-entered `homePoints`/`awayPoints`. It never writes to
   the database.

3. **Report results in plain terms**, not just raw script output:
   - For each mismatched team/matchup: team name, gameweek, manual total, automated total, and
     the delta.
   - Drill into the per-player breakdown the script prints for mismatches — often the delta traces
     to one or two players, which narrows down where to look (wrong position detection? a missing
     `PlayerFixturePoints` row because a fixture hasn't synced? a substitution resolved
     incorrectly?).
   - If a team's automated total is 0 while manual is nonzero, that usually means the automated
     side is missing data entirely (no `GameweekLineup`, no resolved starters, or no
     `PlayerFixturePoints` synced for that gameweek's fixtures yet) rather than a scoring
     calculation bug — say so explicitly, since it's a different class of problem than a wrong
     point value.

4. **When something looks wrong, investigate the likely cause but don't silently fix it.** Point
   at the specific file/model involved (e.g. "this player's `PlayerMatchStats.positionPlayedId`
   is null for this fixture, so `scoringCalculation.ts` may be falling back incorrectly") and let
   the user decide the next step. If the user then asks you to fix the underlying bug, that's a
   separate, explicit request — treat it as such rather than assuming it's implied by a
   validation run.

## What NOT to do

- Do not modify `FantasyMatchup.homePoints`/`awayPoints`.
- Do not modify `app/api/admin/league/matchups/finalize-week/route.ts` to read from the automated
  path.
- Do not mark the automated pipeline as "validated" or suggest cutting over — only the user
  decides when confidence is high enough.
- Do not run this against production data destructively — the script is read-only by design;
  keep it that way if you ever touch it.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Pierson Fantasy — Project Context

## What this is
A dual-purpose fantasy sports app (Next.js 15, App Router, TypeScript) covering:
- Fantasy Football (Premier League) — rosters, waivers, transfer funds, live scoring, auto-substitution
- Survivor fantasy league (separate module)

Stack: Next.js 15 + TypeScript, Prisma (`prisma/schema.prisma`, Postgres) + Supabase, Clerk auth,
Vercel Blob storage (`app/api/upload/route.ts`), Sportmonks API (football data), Vercel hosting,
GitHub Actions running Python scripts for scheduled jobs (`.github/workflows/api-usage-rollup.yml`,
`pregameweek-sync.yml`, `process-scoring.yml`, `waiver-processor.yml`).

## Before writing new code
- **Grep for existing types/functions before creating new ones.** This codebase has had real
  duplicate-type bugs from long-session context loss. Always search first.
- Check `lib/` for an existing pure-function utility before writing new logic inline — this
  project favors small, tested `lib/` functions over inline logic in routes/components.

## Commands
- Build: `npm run build`
- Test: `npm run test` (Vitest — `"test": "vitest run"`)
- Dev server: `npm run dev` — use this for local testing, NOT `npm start` (that runs `next start`
  against a stale production build and will not reflect current source edits)
- Prisma after any schema change: `npx prisma format && npx prisma db push && npx prisma generate`
  — verify the change actually persisted before assuming it's live

## Known environment quirks
- Occasional `Cannot find type definition file for 'X 2'` build errors are local npm/TS cache
  corruption, not a real code bug. Fix: `npm cache clean --force && rm -rf node_modules
  package-lock.json && npm install`. `tsconfig.json` already sets `"types": ["node"]` to reduce
  recurrence.
- `React Hooks purity` lint rule flags `Date.now()`/`new Date()` calls inline in Server Component
  render bodies. For legitimate real-time-window queries (not a render-purity risk in a Server
  Component), an `eslint-disable-next-line react-hooks/purity` with a comment explaining why is
  acceptable.
- One-off diagnostic/admin scripts (run via `npx tsx scripts/whatever.ts`) need explicit env
  loading — static `import` gets hoisted before `dotenv.config()` runs. Use:
```ts
  async function main() {
    const dotenv = await import('dotenv')
    dotenv.config({ path: '.env.local' })
    const { prisma } = await import('@/lib/prisma')
    // ...
  }
  main()
```

## Auth patterns — always use these, never hand-roll
- `lib/apiAuth.ts`: `requireUser()` / `requireSiteAdmin()` — for routes a logged-in person calls
  directly (Clerk session-based)
- `lib/automationAuth.ts`: `requireAutomationSecret(req)` — for scheduled/machine-triggered
  routes (bearer token), e.g. anything called by a Python/GitHub Actions script
- **Any new automation route MUST be covered by `middleware.ts`'s public routes matcher**, or
  Clerk will intercept the unauthenticated request and return a misleading 404 before it reaches
  the route handler. Currently public: `/sign-in`, `/api/webhooks`, `/api/sportmonks`,
  `/api/sync(.*)`, `/api/survivor`, `/api/waivers`, `/api/transfer-and-waiver-processing`,
  `/api/admin/api-usage/rollup`. New automation routes should live under `/api/sync/...` where
  possible, since that prefix is already covered.

## Critical data-correctness pattern: real match data over stored defaults
**Always trust match-specific / event-specific data over a player's general stored defaults.**
`Player.position_id` / `Player.detailed_position_id` are general fallback fields and can be stale
or wrong for a specific match. Wherever position matters for a SPECIFIC match/gameweek — scoring
calculation, real-match lineup rendering, auto-substitution — use
`PlayerMatchStats.positionPlayedId` (captured live from Sportmonks per-match data) instead. This
class of bug has been found and fixed independently in multiple places in this codebase.

GK detection specifically: Sportmonks sometimes returns `24` (the broad "Goalkeeper" type) as the
value in a match's `positionPlayedId` field, not a real detailed sub-position. Treat
`positionPlayedId === 24` as authoritative GK detection for match context, regardless of what the
player's stored `position_id` says. See `app/dashboard/fixtures/[id]/RealMatchView.tsx`.

Note: `prisma/schema.prisma` itself mixes camelCase (`positionPlayedId`) and snake_case
(`position_id`, `detailed_position_id`) field naming — this is real, not a typo; don't "fix" the
casing without checking both API code and DB columns.

## Slot-assignment / matching logic: process fixed before flexible
Any algorithm that assigns players to position "slots" (some FIXED to one specific position, some
FLEXIBLE across a small set) must process FIXED slots first, then FLEXIBLE slots with whoever's
left. Processing in the opposite order (or naively, by highest score first) can "strand" a
narrowly-eligible player when a flexible slot greedily claims someone who had other options. This
logic lives in `lib/autoSubstitution.ts`, `lib/lineupAssignment.ts`, and
`lib/realMatchLineupAssignment.ts` — three related but distinct files, not duplicates of each
other. Any future slot-matching logic should follow this same pattern from the start.

## Testing philosophy
- Pure business logic goes in `lib/`, gets real unit tests (Vitest) covering edge cases —
  reference examples: `lib/autoSubstitution.test.ts`, `lib/scoringCalculation.test.ts`,
  `lib/waiverWindowCalculation.test.ts`, `lib/transferBidResolution.test.ts`,
  `lib/transferCascade.test.ts`
- API routes and UI components are NOT unit tested (deliberate scope decision for this project's
  size) — verification there is manual/build-time
- When in doubt about a non-trivial algorithm's correctness, write the test FIRST with a concrete
  example, especially for anything involving "maximize X across a set of choices" — this project
  has caught real bugs in greedy-first-guess algorithms this way

## Timezone handling
Always compute date-grouping/comparison logic using UTC-explicit methods (`getUTCFullYear()`,
`getUTCMonth()`, etc.), never local-timezone methods (`getFullYear()`, `getMonth()`), when working
with stored timestamps. `lib/apiUsageRollup.ts` does this correctly for its grouping logic — but
note it currently uses a non-UTC `cutoff.setMonth(cutoff.getMonth() - monthsToKeep)` for its
retention cutoff, a latent inconsistency worth fixing if touching that file.

## Sportmonks integration notes
- Base URL: `https://api.sportmonks.com/v3/football` (`lib/sportmonks.ts`)
- Always verify field names/response shapes against REAL API responses before writing parsing
  code — assumed field names and include paths have turned out subtly wrong before. When in
  doubt, fetch one real example and inspect it before writing code against an assumed shape.
- API call budget is tracked in `ApiCallLog`/`ApiUsageMonthlySummary` (`lib/apiCallBudget.ts`) —
  any new Sportmonks-calling code should log its usage via `logApiCall()` with an appropriate
  `ApiCallSource` enum value (defined in `prisma/schema.prisma`).
- Starter tier subscription covers a limited set of leagues — do not assume broader data access
  without verifying against the actual subscription scope.

## Things intentionally deferred / known incomplete
- `isCurrent`/`isComplete` gameweek transitions on `FantasyGameweek`, and `isComplete` on
  `FantasyMatchup`, are currently MANUAL (admin-triggered via Finalize Week /
  `app/api/admin/league/matchups/finalize-week/route.ts` and toggle-complete), not automated.
- **`finalize-week` reads `FantasyMatchup.homePoints`/`awayPoints` directly** to compute
  standings/results — it does NOT read from `GameweekLineupPlayer.resolvedPlayerId` or
  `PlayerFixturePoints`. This is an intentional two-step pipeline: `homePoints`/`awayPoints` are
  currently set manually while the automated scoring path
  (`resolvedPlayerId`/`PlayerFixturePoints`) is still being validated for bugs. Once that
  automated path is trusted, `homePoints`/`awayPoints` should be derived from it instead of set
  by hand — don't "fix" this by wiring finalize-week to the automated fields until that's
  confirmed ready.
- No shared Modal/ConfirmDialog component exists — roughly a dozen files under `app/admin/`
  each hand-roll their own inline modal markup. Two narrow, single-purpose modals do exist
  (`app/components/ClaimModal.tsx`, `app/components/TransferBidModal.tsx`) but aren't generic.
  Worth extracting a shared component if touching admin modal code.
- Two generated Prisma client directories exist (`generated/prisma` and `app/generated/prisma`)
  — check which one is actually imported before assuming both are current.
- Next.js 16 migration is planned but not started.

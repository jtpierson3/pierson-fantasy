---
name: prisma-schema-change
description: Checklist for making and verifying any change to pierson-fantasy's Prisma schema (prisma/schema.prisma) — adding/renaming/removing a model or field, changing a relation, adding an enum value, etc. Use this whenever the user wants to modify the database schema, add a column/field/model, run a migration, or change prisma/schema.prisma in any way. This project has a documented history of schema edits silently failing to persist, and of two separate generated Prisma client directories (generated/prisma and app/generated/prisma) getting out of sync — this skill exists to make sure a schema change is actually verified as live, not just assumed to have worked because the command didn't error.
---

# Prisma Schema Change

## Why this exists

`AGENTS.md` documents two real, repeated failure modes in this project:
1. Schema edits have **silently failed to persist** more than once — the `db push` command
   appears to succeed but the change isn't actually reflected in the database or the generated
   client, and this wasn't caught until something downstream broke mysteriously.
2. There are **two generated Prisma client directories** (`generated/prisma` and
   `app/generated/prisma`) in this repo. If only one gets regenerated, code importing the stale
   one will silently use outdated types/fields.

Both failure modes share the same fix: don't trust that the schema command succeeded just because
it didn't throw — actually verify the change is live before moving on to write code against it.

## Steps

1. **Edit `prisma/schema.prisma`.** Keep the existing style in mind — this schema already mixes
   camelCase and snake_case field naming (e.g. `positionPlayedId` vs `position_id`); match
   whatever convention the model you're editing already uses rather than introducing a third
   style, and don't "fix" existing casing as a side effect of an unrelated change.

2. **Run the full sequence, not just one command:**
   ```bash
   npx prisma format
   npx prisma db push
   npx prisma generate
   ```
   `format` normalizes the file, `db push` applies the change to the actual database, `generate`
   regenerates the TypeScript client. Skipping straight to `generate` without `db push` (or vice
   versa) is how a schema/DB/client mismatch happens.

3. **Know that `lib/prisma.ts` imports the client from the standard `@prisma/client` package**
   (`prisma/schema.prisma`'s `generator client` block has no custom `output` path), which is what
   `npx prisma generate` actually regenerates. The `generated/prisma` and `app/generated/prisma`
   directories in this repo are leftover/unused — nothing in the app imports from either one
   (confirmed by grepping for `generated/prisma` outside those two directories themselves). Don't
   waste time regenerating or checking those two directories after a schema change; they're not
   in the real code path. If you want to reduce future confusion, flag to the user that deleting
   both stale directories is a safe, worthwhile one-time cleanup — but treat that as its own
   explicit task, not something to do silently mid schema-change.

4. **Verify the change actually persisted** — don't stop at "the command didn't error." Two quick
   ways to confirm:
   - Open `prisma/schema.prisma` again (or `git diff` it) and confirm your edit is still there
     and `format` didn't revert or mangle it unexpectedly.
   - Query the actual database for the new/changed field/model, e.g. via a one-off script (see the
     `.env.local` dotenv-loading pattern in `AGENTS.md`) or `npx prisma studio`, to confirm the
     column/table genuinely exists — not just that the Prisma client's TypeScript types now
     mention it. A TS type can update from `generate` even if `db push` silently didn't apply
     against the real database.

5. **Only after confirming the change is live in the database**, write the application code that
   depends on it (new query, new field usage in a route/component, etc.). Writing code against an
   assumed-but-unverified schema change is exactly how this failure mode has bitten this project
   before.

## What NOT to do

- Don't assume `db push` worked just because it returned exit code 0 / printed no error — verify
  against the real database as in step 4.
- Don't regenerate the client without first confirming which of the two generated directories is
  actually used (step 3) — regenerating the unused one and reading no error gives false
  confidence.
- Don't silently rewrite existing field-naming casing while making an unrelated change.

---
name: add-automation-route
description: Checklist for adding a new machine-triggered API route in pierson-fantasy (e.g. an endpoint called by a GitHub Actions / Python script, a cron sync job, or any caller that isn't a logged-in user). Use this whenever the user wants to add, create, or wire up a new automation, sync, cron, scheduled, or webhook-style API route under app/api/. This project has a recurring real bug where a new automation route isn't added to middleware.ts's public matcher, so Clerk intercepts the unauthenticated request and returns a misleading 404 before the route handler ever runs — this skill exists specifically to stop that from happening again.
---

# Add Automation Route

## The bug this prevents

pierson-fantasy uses Clerk middleware (`middleware.ts`) to protect all routes by default. Routes
meant to be called by a machine (GitHub Actions, a Python script, a cron job) don't have a Clerk
session, so they authenticate with a shared secret instead
(`lib/automationAuth.ts::requireAutomationSecret`). If a new route like this isn't explicitly
listed in `middleware.ts`'s public matcher, Clerk's `auth.protect()` intercepts the request before
it ever reaches your route handler — and because Clerk's rejection for an unauthenticated request
to a protected page looks like a 404 rather than a clear 401, this has repeatedly looked like "the
route doesn't exist" rather than "the route is auth-blocked," costing real debugging time. Every
step below exists to catch that specific failure mode before it ships.

## Steps

1. **Decide the route path — prefer `/api/sync/...`.** That prefix is already covered by
   `middleware.ts`'s public matcher (`'/api/sync(.*)'`), so a route placed there needs no
   middleware change. Only reach for a different top-level prefix if the route doesn't
   conceptually belong under sync (e.g. it's a webhook, not a sync job) — in that case you'll need
   step 3.

2. **Use `requireAutomationSecret(req)` from `lib/automationAuth.ts` for auth, not
   `lib/apiAuth.ts`.** `apiAuth.ts`'s `requireUser()`/`requireSiteAdmin()` are for routes a
   logged-in person calls directly through the UI (Clerk session-based) — they will always fail
   for a machine caller with no session, which is a different bug from the middleware one but
   produces similarly confusing symptoms. Call it first thing in the handler:
   ```ts
   const authResult = requireAutomationSecret(req)
   if (!authResult.ok) {
       return NextResponse.json({ error: authResult.error }, { status: authResult.status })
   }
   ```

3. **If the route is NOT under `/api/sync/...`, add its prefix to `middleware.ts`'s
   `isPublicRoute` matcher explicitly.** Open `middleware.ts`, find the `createRouteMatcher([...])`
   array, and add the new prefix following the existing pattern (e.g. `'/api/my-new-thing(.*)'`).
   Skipping this step is exactly the bug this skill exists to prevent — do not skip it just
   because the route "should" be public by virtue of using `requireAutomationSecret`. Clerk
   doesn't know or care what auth check is inside the handler; it blocks first.

4. **Verify by curling the route without any auth headers** and confirming you get a real
   response from your handler (a 401 with the `requireAutomationSecret` error message, or
   whatever validation error comes first) rather than Clerk's blocked-request response. Run the
   dev server (`npm run dev`) and:
   ```bash
   curl -i -X POST http://localhost:3000/api/sync/your-new-route
   ```
   - **Got your handler's own 401/error JSON?** Middleware is correctly letting the request
     through and your auth check is doing its job. You're done with this check.
   - **Got a bare 404 with no JSON body matching your handler's error shape (or Clerk's sign-in
     page HTML)?** Middleware is still blocking it — go back to step 3, you missed a prefix or the
     matcher pattern doesn't cover your actual path.

5. **Then verify the "correct secret" path actually works too**, not just that it's blocked
   correctly:
   ```bash
   curl -i -X POST http://localhost:3000/api/sync/your-new-route \
     -H "Authorization: Bearer $SYNC_SECRET"
   ```
   Confirm this reaches your actual business logic and behaves as expected. A route can pass step
   4's rejection check yet still be broken because the success path was never exercised.

6. **If this route is called from a Python script or a GitHub Actions workflow**, make sure the
   caller sends `Authorization: Bearer <SYNC_SECRET>` and that `SYNC_SECRET` is available in that
   caller's environment (repo secrets for Actions, `.env` for local Python scripts) — a route that
   works when curled manually can still fail in CI if the secret isn't wired into the workflow
   file under `.github/workflows/`.

## Quick self-check before calling it done

- [ ] Route uses `requireAutomationSecret`, not `requireUser`/`requireSiteAdmin`
- [ ] Route path is under `/api/sync/...`, OR its own prefix was added to `middleware.ts`
- [ ] Curled without auth header → got the handler's own rejection, not a bare Clerk-blocked 404
- [ ] Curled with correct `Authorization: Bearer $SYNC_SECRET` → reached real logic successfully
- [ ] If called from GitHub Actions/Python, `SYNC_SECRET` is actually available to that caller

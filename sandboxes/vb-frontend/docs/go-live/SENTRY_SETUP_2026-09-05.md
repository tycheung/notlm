# Sentry APM — slice G notes (2026-09-05)

**Status:** Spec only until DSN secrets exist in each environment  
**Do not invent DSNs in repo.**

## Backend

1. Add `sentry-sdk[fastapi]` to requirements when ready.
2. Init in app lifespan when `SENTRY_DSN` is set:
   - `traces_sample_rate` low in prod (e.g. 0.1)
   - scrub Authorization / cookies
3. Leave unset locally → no-op.

## Frontend

1. Prefer `@sentry/react` (not only `@sentry/node` in Playwright deps).
2. Init in `main.tsx` when `VITE_SENTRY_DSN` is set; source maps upload in CI optional.
3. Tag releases with git SHA.

## Exit criteria

- [ ] DSN in staging + prod secrets managers
- [ ] One deliberate test error visible in each project
- [ ] PII scrub verified on a sample event

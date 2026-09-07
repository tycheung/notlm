# ADR-003 — UI actions only (never call host product APIs)

## Status

Accepted

## Context

An assistant that creates tournaments/events by calling backend APIs bypasses validation, authz UX, confirmations, and the same path a human uses. Victory Bowling explicitly rejected “silent API creates from Assistant.” Testers and hosts need the coach to exercise **real controls**.

## Decision

1. **North star:** The runtime coach **ALWAYS** drives the product the way a user would — navigate, spotlight/flash, fill visible fields, and **activate real buttons/links/controls** (`data-guide-id` targets). Mutations happen only because the host UI’s normal handlers ran.
2. **Forbidden:** Runtime coach code calling host product REST/GraphQL/SDK APIs to create/update/delete domain entities (tournaments, events, scores, etc.).
3. **Allowed:** Host `getContext()` may read app state (including data already loaded via the host’s own queries). Pack JSON load. Build-time CLI tools may read source files / call LLMs — they do not mutate production domain data via APIs either.
4. **Playwright / demos / sandboxes:** E2E and record mode must **click** annotated controls, not stub domain writes through API helpers “on behalf of” the assistant.
5. Prefill is injecting values into **visible form fields**, then the user or an explicit UI submit control commits — not `EventsAPI.create(...)`.

## Consequences

- `executeStep` / nav-skip resolve to routes, modals, spotlights — never to API clients.
- Optional future “auto-click submit” still targets the DOM submit control, not fetch.
- VB maturity non-goal “silent API creates” remains binding for this product.
- Tests that prove coach quality must simulate user actions on UI.

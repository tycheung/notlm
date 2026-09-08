# Alembic cutover plan (v1) — 2026-09-05

**Status:** Planning / ops slice G  
**Goal:** Stop treating SQLModel `create_all` as the source of truth in deployed environments.

## Current state

- App still relies heavily on create/check patterns for local and some deploy paths.
- `backend/alembic.ini` and `scripts/alembic_autogenerate.py` exist but are not the exclusive migration path.

## Cutover steps (do in order)

1. **Inventory** — list tables that exist only via create_all vs any checked-in Alembic revisions.
2. **Baseline** — generate a single baseline revision from a clean prod-like schema dump; stamp existing DBs.
3. **CI gate** — fail PRs that change models without a new Alembic revision (or an explicit skip label).
4. **Deploy** — run `alembic upgrade head` before app start; disable create_all in non-dev.
5. **Rollback** — document `alembic downgrade -1` for the last N revisions only; longer rollbacks are restore-from-backup.

## Non-goals

- Rewriting historical data migrations already applied ad hoc.
- Dual-writing create_all + Alembic in production.

## Exit criteria

- [ ] Prod/staging boot with `RUN_CREATE_ALL=false` (or equivalent) and Alembic only
- [ ] One documented baseline + stamp procedure for existing databases
- [ ] CI checks model diffs against Alembic heads

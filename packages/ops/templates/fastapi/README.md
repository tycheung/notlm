# FastAPI host proxy templates

Canonical UiPilot API routes for hosts. Copy into your backend and wire auth.

| File | Role |
|------|------|
| `uipilot_fallback.py` | `POST /uipilot/fallback` — Laya sidecar / optional LLM (single-shot; chaining is in `@uipilot/core`) |

## Install into a host

```bash
# from uipilot/
cp packages/ops/templates/fastapi/uipilot_fallback.py ../backend/routes/uipilot_fallback.py
```

Then set host-specific pieces:

1. Auth deps (`get_current_active_user`, `get_admin_user`, `User`, DB session)
2. Admin setting key via `UIPILOT_LLM_FALLBACK_SETTING_KEY` (default `uipilot_llm_fallback`)
3. `UIPILOT_LAYA_PRODUCT_ROLE` for refuse copy

Victory Bowling keeps `director_assistant_llm_fallback` as the setting key
(`UIPILOT_LLM_FALLBACK_SETTING_KEY=director_assistant_llm_fallback` in BE `.env`).

**Do not** invent a second chaining layer here — FE uses `invokeChainedDecisionFallback`.

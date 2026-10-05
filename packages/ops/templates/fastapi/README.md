# FastAPI host proxy templates

Canonical NotLM API routes for hosts. Copy into your backend and wire auth.

| File | Role |
|------|------|
| `notlm_fallback.py` | `POST /notlm/fallback` — Laya sidecar / optional LLM (single-shot; chaining is in `@notlm/core`) |

## Install into a host

```bash
# from notlm/
cp packages/ops/templates/fastapi/notlm_fallback.py ../backend/routes/notlm_fallback.py
cp packages/ops/templates/shared/refuse_copy.py ../backend/routes/refuse_copy.py
```

Then set host-specific pieces:

1. Auth deps (`get_current_active_user`, `get_admin_user`, `User`, DB session)
2. Admin setting key via `NOTLM_LLM_FALLBACK_SETTING_KEY` (default `notlm_llm_fallback`)
3. `NOTLM_LAYA_PRODUCT_ROLE` for refuse copy

Hosts may keep a product-named setting key (example: `director_assistant_llm_fallback`)
(`NOTLM_LLM_FALLBACK_SETTING_KEY=director_assistant_llm_fallback` in BE `.env`).

**Do not** invent a second chaining layer here — FE uses `invokeChainedDecisionFallback`.

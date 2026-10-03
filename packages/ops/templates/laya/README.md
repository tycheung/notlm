# NotLM Laya sidecar

Default **on** (`NOTLM_LAYA_ENABLED=1`).

**Source of truth:** this template under `@notlm/ops`. Hosts install a copy:

```bash
# from notlm/
npm run build -w @notlm/ops
npx notlmCLI laya install ../backend
```

```bash
python -m venv .venv
.venv/bin/pip install -r requirements-laya.txt
# Set NOTLM_LAYA_CHECKPOINT to your fine-tuned folder, then:
.venv/bin/python app.py
```

Host API must **proxy** `/notlm/fallback` → `http://127.0.0.1:8765/decide`.

Set `NOTLM_LAYA_PRODUCT_ROLE` per product (default: `a product assistant`).
Coaching / guide tours are a host pack pattern — not the sidecar’s identity.

CPU pack/`ranker.json` promote is host/FE-owned. Do **not** retrain Laya weights on the API host.

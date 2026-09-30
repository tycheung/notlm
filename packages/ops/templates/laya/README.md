# UiPilot Laya sidecar

Default **on** (`UIPILOT_LAYA_ENABLED=1`).

**Source of truth:** this template under `@uipilot/ops`. Hosts install a copy:

```bash
# from uipilot/
npm run build -w @uipilot/ops
npx uipilotCLI laya install ../backend
```

```bash
python -m venv .venv
.venv/bin/pip install -r requirements-laya.txt
# Set UIPILOT_LAYA_CHECKPOINT to your fine-tuned folder, then:
.venv/bin/python app.py
```

Host API must **proxy** `/uipilot/fallback` → `http://127.0.0.1:8765/decide`.

Set `UIPILOT_LAYA_PRODUCT_ROLE` per product (default: `a product coach`).

CPU pack/`ranker.json` promote is host/FE-owned. Do **not** retrain Laya weights on the API host.

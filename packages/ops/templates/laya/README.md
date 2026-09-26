# UiPilot Laya sidecar

Default **on** (`UIPILOT_LAYA_ENABLED=1`).

```bash
python -m venv .venv
.venv/bin/pip install -r requirements-laya.txt
# Set UIPILOT_LAYA_CHECKPOINT to your fine-tuned folder, then:
.venv/bin/python app.py
```

Host API must **proxy** `/uipilot/fallback` → `http://127.0.0.1:8765/decide`.
Nightly learning updates pack/`ranker.json` on CPU — it does **not** retrain Laya here.

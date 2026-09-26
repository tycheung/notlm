"""
CPU-only nightly promote: MissExchange → aliases/scenarios → ranker.json.
Never calls Laya weight train.
"""
from __future__ import annotations

# Hosts wire this into Celery beat. Example:
# @app.task
# def uipilot_nightly_promote():
#     subprocess.check_call(["npx", "uipilot-training", "feedback", "pull", ...])
#     subprocess.check_call(["npx", "uipilot-training", "auto", "ranker", APP_DIR])

PROMOTE_STEPS = (
    "feedback pull exchanges",
    "confidence-gated fold aliases/scenarios/faq",
    "intents check",
    "auto ranker (CPU)",
)

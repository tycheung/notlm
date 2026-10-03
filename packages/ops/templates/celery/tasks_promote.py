"""
CPU-only nightly promote: MissExchange → aliases/scenarios → ranker.json.
Never calls Laya weight train.

Hosts that ship the pack via a separate static frontend (S3/CloudFront) should
**not** run this on the API box — run promote beside the frontend checkout / CI
instead, then redeploy the FE build. Co-located monorepo hosts may wire Celery.
"""
from __future__ import annotations

# Hosts wire this into Celery beat only when APP_DIR + Node exist on the worker.
# Example:
# @app.task
# def notlm_nightly_promote():
#     subprocess.check_call(["npx", "notlm-training", "feedback", "pull", ...])
#     subprocess.check_call(["npx", "notlm-training", "auto", "ranker", APP_DIR])

PROMOTE_STEPS = (
    "feedback pull exchanges",
    "confidence-gated fold aliases/scenarios/faq",
    "intents check",
    "auto ranker (CPU)",
)

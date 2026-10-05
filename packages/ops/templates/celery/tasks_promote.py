"""
CPU-only nightly promote: MissExchange → aliases/scenarios → ranker.json.
Never calls Laya weight train.

Hosts that ship the pack via a separate static frontend (S3/CloudFront) should
**not** run this on the API box — run promote beside the frontend checkout / CI
instead, then redeploy the FE build. Co-located monorepo hosts may wire Celery.

Wire into Celery beat on the worker that has Node + `.notlm`:

    @app.task
    def notlm_nightly_promote_task():
        return notlm_nightly_promote()

Then replace the body with host offline tooling that:

  1. Pulls MissExchange / conversation logs from the host API
  2. Folds confidence-gated aliases / scenarios / FAQ drafts into `.notlm/`
  3. Runs `npx notlmCLI intents check <APP_DIR>`
  4. Retrains CPU `ranker.json` (not Laya weight fine-tunes)
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

PROMOTE_STEPS = (
    "pull MissExchange / conversation logs",
    "confidence-gated fold aliases/scenarios/faq",
    "notlmCLI intents check",
    "retrain CPU ranker.json (not Laya weights)",
)


def notlm_nightly_promote() -> dict[str, Any]:
    """
    Log the promote pipeline steps and return a host wiring hint.

    This module does not shell out — hosts decorate with @app.task and call
    their offline pack-promote tooling beside the checkout that owns `.notlm`.
    """
    for i, step in enumerate(PROMOTE_STEPS, start=1):
        line = f"[notlm nightly promote] {i}/{len(PROMOTE_STEPS)}: {step}"
        logger.info(line)
        print(line)

    message = (
        "NotLM nightly promote scaffold: wire Celery to pull misses, fold "
        "drafts, run `npx notlmCLI intents check`, and retrain CPU ranker.json "
        "on the host checkout with `.notlm`."
    )
    logger.info(message)
    return {
        "ok": True,
        "wired": False,
        "steps": list(PROMOTE_STEPS),
        "message": message,
    }

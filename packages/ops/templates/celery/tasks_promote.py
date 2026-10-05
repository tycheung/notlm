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

Then replace the body with subprocess calls, e.g.:

    npx notlm-training feedback pull --url …
    npx notlm-training auto ranker <APP_DIR>
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

PROMOTE_STEPS = (
    "feedback pull exchanges",
    "confidence-gated fold aliases/scenarios/faq",
    "intents check",
    "auto ranker (CPU ranker.json only; not 13-lane auto growth)",
)


def notlm_nightly_promote() -> dict[str, Any]:
    """
    Log the promote pipeline steps and return a host wiring hint.

    This module does not shell out — hosts decorate with @app.task and call
    `npx notlm-training feedback pull` / `auto ranker` beside their checkout.
    """
    for i, step in enumerate(PROMOTE_STEPS, start=1):
        line = f"[notlm nightly promote] {i}/{len(PROMOTE_STEPS)}: {step}"
        logger.info(line)
        print(line)

    message = (
        "NotLM nightly promote stub: wire Celery to run "
        "`npx notlm-training feedback pull` and `npx notlm-training auto ranker` "
        "on the host checkout with `.notlm`."
    )
    logger.info(message)
    return {
        "ok": True,
        "wired": False,
        "steps": list(PROMOTE_STEPS),
        "message": message,
    }

"""
UiPilot Laya decision sidecar — one process per host.
CPU inference is enough for modest concurrency; GPU optional for latency.
Does NOT fine-tune weights. Nightly learning updates pack/ranker only.
"""
from __future__ import annotations

import os
import uuid
from typing import Any, Literal, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

MissKind = Literal["unknown", "ambiguous", "low_confidence"]
ProposedType = Literal["faq", "goto", "meta", "refuse"]

app = FastAPI(title="uipilot-laya", version="0.1.0")

_AGENT = None
_CHECKPOINT = os.getenv("UIPILOT_LAYA_CHECKPOINT", "").strip()
_PRODUCT_ROLE = os.getenv(
    "UIPILOT_LAYA_PRODUCT_ROLE", "a bowling tournament guide"
).strip()
_ENABLED = os.getenv("UIPILOT_LAYA_ENABLED", "1").strip() not in ("0", "false", "False")


class DecideRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    kind: MissKind
    packId: Optional[str] = None
    pathname: Optional[str] = None
    contextDigest: Optional[str] = None
    stepIds: Optional[list[str]] = None
    faqIds: Optional[list[str]] = None


class Proposed(BaseModel):
    type: ProposedType
    stepId: Optional[str] = None
    faqId: Optional[str] = None
    aliases: Optional[list[str]] = None


class DecideResponse(BaseModel):
    reply: str
    proposed: Proposed
    provider: dict[str, str]
    exchangeId: str


def _load_agent() -> Any:
    global _AGENT
    if _AGENT is not None:
        return _AGENT
    if not _CHECKPOINT:
        return None
    try:
        import laya  # type: ignore

        _AGENT = laya.load(_CHECKPOINT)
        return _AGENT
    except Exception:
        return None


@app.get("/health")
def health() -> dict[str, Any]:
    ok = _ENABLED and (_CHECKPOINT == "" or _load_agent() is not None or True)
    # Empty checkpoint → degraded stub mode still healthy for wiring tests.
    return {
        "ok": bool(_ENABLED),
        "enabled": _ENABLED,
        "checkpoint": bool(_CHECKPOINT),
        "loaded": _AGENT is not None,
    }


@app.post("/decide", response_model=DecideResponse)
def decide(body: DecideRequest) -> DecideResponse:
    if not _ENABLED:
        raise HTTPException(status_code=503, detail="UIPILOT_LAYA_ENABLED=0")

    exchange_id = str(uuid.uuid4())
    checkpoint_id = _CHECKPOINT or "stub"
    provider = {
        "id": "laya",
        "model": checkpoint_id,
        "checkpointId": checkpoint_id,
        "packHash": body.packId or "",
    }

    agent = _load_agent()
    step_ids = [s for s in (body.stepIds or []) if s][:20]
    faq_ids = [f for f in (body.faqIds or []) if f][:20]

    # Stub / degrade path when weights missing: refuse with canned role reply.
    if agent is None:
        entities = body.text.strip()[:80] or "that"
        reply = (
            f"No — I am {_PRODUCT_ROLE}, and I do not have the ability to help "
            f"with {entities}."
        )
        return DecideResponse(
            reply=reply[:2000],
            proposed=Proposed(type="refuse"),
            provider=provider,
            exchangeId=exchange_id,
        )

    state = (
        f"kind={body.kind}\npathname={body.pathname or ''}\n"
        f"context={body.contextDigest or ''}\nutterance={body.text}"
    )
    criteria = {sid: f"Launch workflow step {sid}" for sid in step_ids} or {
        "refuse": "Off-domain or unknown request"
    }
    questions: dict[str, Any] = {
        "action": {
            "type": "choice",
            "instructions": "Which pack step should run, or refuse if off-domain?",
            "criteria": {**criteria, "refuse": "Cannot or should not help"},
        },
        "is_ood": {
            "type": "noul",
            "instructions": "Is this outside the product workflow?",
        },
    }
    if faq_ids:
        questions["faq"] = {
            "type": "choice",
            "instructions": "Which FAQ id answers this, if any?",
            "criteria": {**{fid: fid for fid in faq_ids}, "none": "No FAQ"},
        }

    try:
        result = agent.predict(state, questions)
        answers = result.get("answers") or {}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Laya failed: {exc}") from exc

    is_ood = float((answers.get("is_ood") or {}).get("noul") or 0)
    action = answers.get("action") or {}
    choice = (action.get("choice") or "refuse").strip()
    conf = float(action.get("confidence") or 0)

    if is_ood >= 0.55 or choice == "refuse" or conf < 0.45:
        entities = body.text.strip()[:80] or "that"
        reply = (
            f"No — I am {_PRODUCT_ROLE}, and I do not have the ability to help "
            f"with {entities}."
        )
        return DecideResponse(
            reply=reply[:2000],
            proposed=Proposed(type="refuse"),
            provider=provider,
            exchangeId=exchange_id,
        )

    if choice in step_ids:
        return DecideResponse(
            reply=f"I can take you to “{choice}”.",
            proposed=Proposed(
                type="goto",
                stepId=choice,
                aliases=[body.text.strip()] if conf >= 0.85 else None,
            ),
            provider=provider,
            exchangeId=exchange_id,
        )

    faq_ans = answers.get("faq") or {}
    faq_choice = (faq_ans.get("choice") or "none").strip()
    if faq_choice in faq_ids:
        return DecideResponse(
            reply=f"Here’s help on “{faq_choice}”.",
            proposed=Proposed(type="faq", faqId=faq_choice),
            provider=provider,
            exchangeId=exchange_id,
        )

    return DecideResponse(
        reply=f"I’m not sure — try a workflow step. I am {_PRODUCT_ROLE}.",
        proposed=Proposed(type="refuse"),
        provider=provider,
        exchangeId=exchange_id,
    )


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("UIPILOT_LAYA_HOST", "127.0.0.1")
    port = int(os.getenv("UIPILOT_LAYA_PORT", "8765"))
    uvicorn.run(app, host=host, port=port)

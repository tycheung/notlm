"""
NotLM Laya decision sidecar — one process per host.
CPU inference is enough for modest concurrency; GPU optional for latency.
Does NOT fine-tune weights. Nightly learning updates pack/ranker only.

Source of truth: notlm/packages/ops/templates/laya/sidecar_app.py
Hosts scaffold with: notlmCLI laya install <backend-dir>
"""
from __future__ import annotations

import os
import re
import uuid
from typing import Any, Literal, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

MissKind = Literal["unknown", "ambiguous", "low_confidence"]
ProposedType = Literal[
    "faq", "goto", "meta", "refuse", "query", "mutation", "tour", "search"
]

app = FastAPI(title="notlm-laya", version="0.1.0")

_AGENT = None
_CHECKPOINT = os.getenv("NOTLM_LAYA_CHECKPOINT", "").strip()
_PRODUCT_ROLE = os.getenv("NOTLM_LAYA_PRODUCT_ROLE", "a product assistant").strip()
_ENABLED = os.getenv("NOTLM_LAYA_ENABLED", "1").strip() not in ("0", "false", "False")

_DISFLUENCY = re.compile(
    r"^(?:uhh?|umm?|er|ah|like|so|well|okay|ok|hey|yo|pls|please)(?:\s+|$)",
    re.I,
)
_QUESTION_FRAME = re.compile(
    r"^(?:what(?:'s|s| are| is)|how(?: do| does| can| to)?|where(?: do| can)?|"
    r"why(?: do| is)?|tell me(?: about)?|help(?: me)?(?: with| understand)?|explain)\s+",
    re.I,
)
_STOP = {
    "a",
    "an",
    "the",
    "and",
    "or",
    "for",
    "to",
    "of",
    "me",
    "my",
    "you",
    "i",
    "please",
    "can",
    "could",
    "would",
    "should",
    "will",
    "make",
    "create",
    "open",
    "show",
    "get",
    "help",
    "with",
    "about",
    "what",
    "whats",
    "how's",
    "how",
    "why",
    "when",
    "where",
    "who",
    "which",
    "is",
    "are",
    "do",
    "does",
    "did",
    "tell",
}


def _entity_label(utterance: str) -> str:
    cleaned = re.sub(r"[?!.,;:]+", " ", utterance or "")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned:
        return "that"
    for _ in range(3):
        nxt = _DISFLUENCY.sub("", cleaned).strip()
        if nxt == cleaned:
            break
        cleaned = nxt
    cleaned = _QUESTION_FRAME.sub("", cleaned).strip()
    tokens = [t for t in cleaned.split() if len(t) > 1 and t.lower() not in _STOP]
    if not tokens:
        return "that"
    phrase = " ".join(tokens[:4])
    return phrase[:48] if phrase else "that"


def _refuse_reply(utterance: str) -> str:
    entities = _entity_label(utterance)
    return (
        f"No — I am {_PRODUCT_ROLE}, and I do not have the ability to help "
        f"with {entities}."
    )


class DecideRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    kind: MissKind
    packId: Optional[str] = None
    pathname: Optional[str] = None
    contextDigest: Optional[str] = None
    stepIds: Optional[list[str]] = None
    faqIds: Optional[list[str]] = None
    queryIds: Optional[list[str]] = None
    mutationIds: Optional[list[str]] = None
    tourIds: Optional[list[str]] = None
    searchIds: Optional[list[str]] = None


class Proposed(BaseModel):
    type: ProposedType
    stepId: Optional[str] = None
    faqId: Optional[str] = None
    queryId: Optional[str] = None
    mutationId: Optional[str] = None
    tourId: Optional[str] = None
    searchId: Optional[str] = None
    aliases: Optional[list[str]] = None


def _expand_capability_faq(faq_choice: str) -> Optional[Proposed]:
    """Map query:/mutation:/tour:/search: FAQ-head choices to proposed types."""
    for prefix, field, ptype in (
        ("query:", "queryId", "query"),
        ("mutation:", "mutationId", "mutation"),
        ("tour:", "tourId", "tour"),
        ("search:", "searchId", "search"),
    ):
        if faq_choice.startswith(prefix):
            cid = faq_choice[len(prefix) :].strip()
            if cid:
                return Proposed(type=ptype, **{field: cid})  # type: ignore[arg-type]
    return None


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
    # Empty checkpoint → degraded stub mode still healthy for wiring tests.
    if _ENABLED and _CHECKPOINT:
        _load_agent()
    return {
        "ok": bool(_ENABLED),
        "enabled": _ENABLED,
        "checkpoint": bool(_CHECKPOINT),
        "loaded": _AGENT is not None,
    }


@app.post("/decide", response_model=DecideResponse)
def decide(body: DecideRequest) -> DecideResponse:
    if not _ENABLED:
        raise HTTPException(status_code=503, detail="NOTLM_LAYA_ENABLED=0")

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
    for qid in body.queryIds or []:
        if qid:
            faq_ids.append(f"query:{qid}")
    for mid in body.mutationIds or []:
        if mid:
            faq_ids.append(f"mutation:{mid}")
    for tid in body.tourIds or []:
        if tid:
            faq_ids.append(f"tour:{tid}")
    for sid in body.searchIds or []:
        if sid:
            faq_ids.append(f"search:{sid}")
    faq_ids = list(dict.fromkeys(faq_ids))[:40]

    # Stub / degrade path when weights missing: refuse with canned role reply.
    if agent is None:
        return DecideResponse(
            reply=_refuse_reply(body.text)[:2000],
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

    faq_ans = answers.get("faq") or {}
    faq_choice = (faq_ans.get("choice") or "none").strip()
    expanded = _expand_capability_faq(faq_choice)
    if expanded is not None:
        return DecideResponse(
            reply=f"I can look that up ({faq_choice}).",
            proposed=expanded,
            provider=provider,
            exchangeId=exchange_id,
        )

    if is_ood >= 0.55 or choice == "refuse" or conf < 0.45:
        return DecideResponse(
            reply=_refuse_reply(body.text)[:2000],
            proposed=Proposed(type="refuse"),
            provider=provider,
            exchangeId=exchange_id,
        )

    # Borderline OOD: never auto-goto (host may still chip high-conf gotos).
    if is_ood >= 0.35 and choice in step_ids and conf < 0.85:
        return DecideResponse(
            reply=_refuse_reply(body.text)[:2000],
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

    if faq_choice in faq_ids and faq_choice != "none":
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

    host = os.getenv("NOTLM_LAYA_HOST", "127.0.0.1")
    port = int(os.getenv("NOTLM_LAYA_PORT", "8765"))
    uvicorn.run(app, host=host, port=port)

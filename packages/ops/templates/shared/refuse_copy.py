"""Shared refuse / entity-label helpers for Laya sidecar + FastAPI fallback templates."""
from __future__ import annotations

import re
from typing import Any, Optional

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


def entity_label(utterance: str) -> str:
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


def refuse_reply(_utterance: str, product_role: str) -> str:
    # Never echo the user utterance — product refuse copy must stay neutral.
    role = (product_role or "a product assistant").strip() or "a product assistant"
    return (
        f"No — I am {role}. I only cover in-product workflow steps and "
        "product questions — not that request."
    )


def expand_capability_faq(faq_choice: str) -> Optional[dict[str, Any]]:
    """Map query:/mutation:/tour:/search: FAQ-head choices to proposed field dicts."""
    for prefix, field, ptype in (
        ("query:", "queryId", "query"),
        ("mutation:", "mutationId", "mutation"),
        ("tour:", "tourId", "tour"),
        ("search:", "searchId", "search"),
    ):
        if faq_choice.startswith(prefix):
            cid = faq_choice[len(prefix) :].strip()
            if cid:
                return {"type": ptype, field: cid}
    return None

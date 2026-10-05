"""Host NotLM decision fallback: Laya sidecar proxy (default) or optional LLM.

**Source of truth:** ``notlm/packages/ops/templates/fastapi/notlm_fallback.py``
Hosts copy this into their API routes and wire auth / settings (see README.md).

Chaining (NLU miss → Laya → LLM on refuse) lives in sealed ``@notlm/core``
(``invokeChainedDecisionFallback``). This route is a single-shot provider:
request ``provider`` may force ``laya`` or ``llm`` so the host can wire
``fallbackLlm`` + ``secondaryFallbackLlm`` separately.

HOST WIRING (replace these imports for your auth/settings stack):
  - get_admin_user / get_current_active_user
  - get_session / User
  - get_setting_by_key (LLM fallback admin flag)
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import uuid
from collections import defaultdict
from pathlib import Path
from typing import Any, Literal, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

# --- HOST: swap these four imports for your app ---
from auth.dependencies import get_admin_user, get_current_active_user
from core.database import get_session
from models.user import User
from services.system_settings import get_setting_by_key
from sqlalchemy.ext.asyncio import AsyncSession

# refuse_copy.py beside this file (host) or templates/shared (monorepo SoT).
_here = Path(__file__).resolve().parent
for _cand in (_here, _here.parent / "shared"):
    if (_cand / "refuse_copy.py").is_file():
        if str(_cand) not in sys.path:
            sys.path.insert(0, str(_cand))
        break
from refuse_copy import expand_capability_faq, refuse_reply  # noqa: E402

router = APIRouter()

MissKind = Literal["unknown", "ambiguous", "low_confidence"]
ProposedType = Literal[
    "faq", "goto", "meta", "refuse", "query", "mutation", "tour", "search"
]
FallbackProvider = Literal["laya", "llm"]

_DEFAULT_PRODUCT_ROLE = "a product assistant"
_RATE_WINDOW_SEC = 60.0
# Load-test friendly: Laya→LLM is two POSTs per miss; keep ≥120 so paced stress
# (~1 turn / 2s) stays under the ceiling.
_RATE_MAX_PER_USER = 120

# HOST: admin setting key that enables secondary LLM after Laya refuse.
_LLM_FALLBACK_SETTING_KEY = os.getenv(
    "NOTLM_LLM_FALLBACK_SETTING_KEY", "notlm_llm_fallback"
)

# user_id -> list[timestamp]
_rate_buckets: dict[int, list[float]] = defaultdict(list)


class FallbackRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    kind: MissKind
    packId: Optional[str] = Field(default=None, max_length=128)
    pathname: Optional[str] = Field(default=None, max_length=512)
    contextDigest: Optional[str] = Field(default=None, max_length=2000)
    stepIds: Optional[list[str]] = Field(default=None, max_length=50)
    faqIds: Optional[list[str]] = Field(default=None, max_length=50)
    queryIds: Optional[list[str]] = Field(default=None, max_length=50)
    mutationIds: Optional[list[str]] = Field(default=None, max_length=50)
    tourIds: Optional[list[str]] = Field(default=None, max_length=50)
    searchIds: Optional[list[str]] = Field(default=None, max_length=50)
    # Vision payload — only used when a vision-capable LLM is configured.
    imageBase64: Optional[str] = Field(default=None, max_length=2_000_000)
    imageMime: Optional[str] = Field(default=None, max_length=64)
    # Per-call override so @notlm can chain Laya then LLM as two host fns.
    provider: Optional[FallbackProvider] = None


class FallbackProposed(BaseModel):
    type: ProposedType
    stepId: Optional[str] = None
    faqId: Optional[str] = None
    queryId: Optional[str] = None
    mutationId: Optional[str] = None
    tourId: Optional[str] = None
    searchId: Optional[str] = None
    aliases: Optional[list[str]] = None


class FallbackResponse(BaseModel):
    reply: str
    proposed: Optional[FallbackProposed] = None
    provider: dict[str, str]
    exchangeId: str


def _laya_enabled() -> bool:
    return os.getenv("NOTLM_LAYA_ENABLED", "1").strip().lower() not in (
        "0",
        "false",
        "no",
    )


def resolve_fallback_provider(
    override: Optional[FallbackProvider] = None,
) -> FallbackProvider:
    """Default Laya; explicit ``llm`` keeps legacy BYO LLM path.

    Per-request ``override`` wins so sealed notlm can call this route twice
    (primary Laya, secondary LLM) without server-side chaining.
    """
    if override in ("laya", "llm"):
        return override
    raw = (os.getenv("NOTLM_FALLBACK_PROVIDER") or "").strip().lower()
    if raw == "llm":
        return "llm"
    if raw == "laya":
        return "laya"
    if _laya_enabled():
        return "laya"
    return "laya"


def _laya_base_url() -> str:
    return (os.getenv("NOTLM_LAYA_URL") or "http://127.0.0.1:8765").strip().rstrip(
        "/"
    )


def _product_role() -> str:
    role = (os.getenv("NOTLM_LAYA_PRODUCT_ROLE") or _DEFAULT_PRODUCT_ROLE).strip()
    return role or _DEFAULT_PRODUCT_ROLE


def _canned_refuse_reply(utterance: str) -> str:
    return refuse_reply(utterance, _product_role())


def _degraded_laya_response(body: FallbackRequest) -> FallbackResponse:
    return FallbackResponse(
        reply=_canned_refuse_reply(body.text)[:2000],
        proposed=FallbackProposed(type="refuse"),
        provider={"id": "laya", "model": "degraded"},
        exchangeId=str(uuid.uuid4()),
    )


def _degraded_llm_response(
    body: FallbackRequest, *, model: str = "degraded"
) -> FallbackResponse:
    return FallbackResponse(
        reply=_canned_refuse_reply(body.text)[:2000],
        proposed=FallbackProposed(type="refuse"),
        provider={"id": "llm", "model": model},
        exchangeId=str(uuid.uuid4()),
    )


def _clamp_proposed(
    proposed: FallbackProposed,
    step_ids: Optional[list[str]],
    *,
    query_ids: Optional[list[str]] = None,
    mutation_ids: Optional[list[str]] = None,
    tour_ids: Optional[list[str]] = None,
    search_ids: Optional[list[str]] = None,
) -> FallbackProposed:
    """Force refuse when catalog ids are missing from the provided catalogs."""
    if proposed.type == "goto":
        sid = (proposed.stepId or "").strip()
        if not sid:
            return FallbackProposed(type="refuse")
        if step_ids is not None:
            allowed = {s for s in step_ids if s}
            if allowed and sid not in allowed:
                return FallbackProposed(type="refuse")
        return proposed
    if proposed.type == "query":
        qid = (proposed.queryId or "").strip()
        allowed = {s for s in (query_ids or []) if s}
        if not qid or (allowed and qid not in allowed):
            return FallbackProposed(type="refuse")
        return proposed
    if proposed.type == "mutation":
        mid = (proposed.mutationId or "").strip()
        allowed = {s for s in (mutation_ids or []) if s}
        if not mid or (allowed and mid not in allowed):
            return FallbackProposed(type="refuse")
        return proposed
    if proposed.type == "tour":
        tid = (proposed.tourId or "").strip()
        allowed = {s for s in (tour_ids or []) if s}
        if not tid or (allowed and tid not in allowed):
            return FallbackProposed(type="refuse")
        return proposed
    if proposed.type == "search":
        sid = (proposed.searchId or "").strip()
        allowed = {s for s in (search_ids or []) if s}
        if not sid or (allowed and sid not in allowed):
            return FallbackProposed(type="refuse")
        return proposed
    return proposed


async def _llm_fallback_flag_enabled(db: AsyncSession) -> bool:
    """Admin public flag: secondary LLM after Laya refuse (default off)."""
    setting = await get_setting_by_key(db, _LLM_FALLBACK_SETTING_KEY)
    if setting is None or setting.value is None:
        return False
    return setting.value.strip().lower() == "true"


def check_rate_limit(user_id: int, *, now: float | None = None) -> None:
    """Simple in-memory per-user limit for fallback calls."""
    ts = now if now is not None else time.monotonic()
    window_start = ts - _RATE_WINDOW_SEC
    bucket = _rate_buckets[user_id]
    _rate_buckets[user_id] = [t for t in bucket if t >= window_start]
    if len(_rate_buckets[user_id]) >= _RATE_MAX_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="NotLM fallback rate limit exceeded",
        )
    _rate_buckets[user_id].append(ts)


def reset_rate_limits_for_tests() -> None:
    _rate_buckets.clear()


def _expand_capability_faq_id(faq_id: str) -> Optional[FallbackProposed]:
    raw = expand_capability_faq(faq_id)
    return FallbackProposed(**raw) if raw else None


def _parse_laya_response(data: dict[str, Any]) -> FallbackResponse:
    reply = str(data.get("reply") or "").strip()
    if not reply:
        reply = "I'm not sure how to help with that yet — try a workflow step name."
    proposed_raw = data.get("proposed")
    proposed: Optional[FallbackProposed] = None
    if isinstance(proposed_raw, dict) and proposed_raw.get("type") in (
        "faq",
        "goto",
        "meta",
        "refuse",
        "query",
        "mutation",
        "tour",
        "search",
    ):
        proposed = FallbackProposed(
            type=proposed_raw["type"],
            stepId=proposed_raw.get("stepId"),
            faqId=proposed_raw.get("faqId"),
            queryId=proposed_raw.get("queryId"),
            mutationId=proposed_raw.get("mutationId"),
            tourId=proposed_raw.get("tourId"),
            searchId=proposed_raw.get("searchId"),
            aliases=proposed_raw.get("aliases")
            if isinstance(proposed_raw.get("aliases"), list)
            else None,
        )
    else:
        proposed = FallbackProposed(type="refuse")
    if proposed.type == "faq" and proposed.faqId:
        expanded = _expand_capability_faq_id(proposed.faqId)
        if expanded is not None:
            proposed = expanded
    provider_raw = data.get("provider")
    provider: dict[str, str] = {"id": "laya", "model": "laya"}
    if isinstance(provider_raw, dict):
        pid = provider_raw.get("id") or provider_raw.get("checkpointId") or "laya"
        model = provider_raw.get("model") or provider_raw.get("checkpointId") or "laya"
        provider = {"id": str(pid), "model": str(model)}
    exchange_id = data.get("exchangeId") or str(uuid.uuid4())
    return FallbackResponse(
        reply=reply[:2000],
        proposed=proposed,
        provider=provider,
        exchangeId=str(exchange_id),
    )


async def _proxy_laya(body: FallbackRequest) -> FallbackResponse:
    payload = body.model_dump(exclude_none=True, exclude={"provider"})
    timeout = httpx.Timeout(12.0)
    url = f"{_laya_base_url()}/decide"
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            res = await client.post(url, json=payload)
            if res.status_code >= 500:
                return _degraded_laya_response(body)
            res.raise_for_status()
            data = res.json()
            if not isinstance(data, dict):
                return _degraded_laya_response(body)
            return _parse_laya_response(data)
    except (httpx.HTTPError, json.JSONDecodeError, ValueError):
        return _degraded_laya_response(body)


# --- Optional LLM provider (NOTLM_FALLBACK_PROVIDER=llm) ---


def _provider_env_peek() -> dict[str, Any]:
    """Soft read of NOTLM_LLM_* for status probes (never raises)."""
    raw = (os.getenv("NOTLM_LLM_PROVIDER") or "").strip().lower()
    model = (os.getenv("NOTLM_LLM_MODEL") or "").strip()
    base = (os.getenv("NOTLM_LLM_BASE_URL") or "").strip().rstrip("/")
    api_key = (os.getenv("NOTLM_LLM_API_KEY") or "").strip() or None

    aliases = {
        "openai_compatible": "openai-compat",
        "claude": "anthropic",
        "hf": "huggingface",
        "hugging-face": "huggingface",
    }
    provider_id = aliases.get(raw, raw)

    defaults = {
        "ollama": "http://127.0.0.1:11434",
        "openai": "https://api.openai.com",
        "anthropic": "https://api.anthropic.com",
        "huggingface": "https://router.huggingface.co",
    }
    if provider_id == "openai-compat" and not base:
        return {
            "configured": False,
            "error": "NOTLM_LLM_BASE_URL required for openai-compat",
        }
    if not base and provider_id in defaults:
        base = defaults[provider_id]
    if not provider_id or not model or not base:
        return {"configured": False, "error": "NOTLM_LLM_* not configured on server"}
    if provider_id != "ollama" and not api_key:
        return {
            "configured": False,
            "error": f"NOTLM_LLM_API_KEY required for {provider_id}",
        }

    if provider_id in ("openai", "openai-compat", "huggingface"):
        wire = "openai-compat"
    elif provider_id == "anthropic":
        wire = "anthropic"
    elif provider_id == "ollama":
        wire = "ollama"
    else:
        return {
            "configured": False,
            "error": f"Unsupported NOTLM_LLM_PROVIDER: {provider_id}",
        }
    return {
        "configured": True,
        "wire": wire,
        "base": base,
        "model": model,
        "api_key": api_key,
        "provider_id": provider_id,
    }


def _endpoint_hint(base: str) -> str:
    """Redact path; show host:port only."""
    try:
        from urllib.parse import urlparse

        parsed = urlparse(base)
        host = parsed.hostname or "unknown"
        port = parsed.port
        if port:
            return f"{host}:{port}"
        return host
    except Exception:  # noqa: BLE001
        return "configured"


def _system_prompt() -> str:
    role = _product_role()
    scope = (
        os.getenv("NOTLM_LLM_SCOPE_HINT")
        or "the host product's UI workflow and catalogued steps"
    ).strip()
    return (
        f"You are a backup assistant for {role} — covering {scope}. "
        "Reply in 1-3 short sentences. "
        "Return a single JSON object: "
        '{"reply":"string","proposed":{"type":"faq|goto|meta|refuse|query|mutation|tour|search",'
        '"stepId":"optional","faqId":"optional","queryId":"optional",'
        '"mutationId":"optional","tourId":"optional","searchId":"optional",'
        '"aliases":["optional"]}}. '
        "Use proposed.type=goto only with a stepId from the allowed step catalog. "
        "Use proposed.type=faq only with a faqId from the allowed FAQ catalog when provided. "
        "Use proposed.type=query for personal schedule/billing/pending/data facts "
        "(queryId from allowedQueryIds) — never invent dates or venues. "
        "Use proposed.type=mutation for do-it writes (mutationId from catalog; host will confirm). "
        "Use proposed.type=tour or search with catalog ids when matching. "
        "Use proposed.type=refuse for anything off-domain or not mappable to the catalog — "
        "including cooking, recipes (e.g. apple pie), general trivia, medical/legal advice, "
        "and any request outside the host product scope. "
        "If an image is attached but you cannot view images, refuse and ask for a text description. "
        "Never invent API calls, step ids, or claim you mutated host data."
    )


def _user_blob(body: FallbackRequest) -> str:
    step_ids = [s for s in (body.stepIds or []) if s][:50]
    faq_ids = [f for f in (body.faqIds or []) if f][:50]
    query_ids = [q for q in (body.queryIds or []) if q][:50]
    mutation_ids = [m for m in (body.mutationIds or []) if m][:50]
    tour_ids = [t for t in (body.tourIds or []) if t][:50]
    search_ids = [s for s in (body.searchIds or []) if s][:50]
    vision = "yes" if (body.imageBase64 or "").strip() else "no"
    return (
        f"kind={body.kind}\npackId={body.packId or ''}\n"
        f"pathname={body.pathname or ''}\n"
        f"contextDigest={body.contextDigest or ''}\n"
        f"allowedStepIds={','.join(step_ids)}\n"
        f"allowedFaqIds={','.join(faq_ids)}\n"
        f"allowedQueryIds={','.join(query_ids)}\n"
        f"allowedMutationIds={','.join(mutation_ids)}\n"
        f"allowedTourIds={','.join(tour_ids)}\n"
        f"allowedSearchIds={','.join(search_ids)}\n"
        f"hasImage={vision}\n"
        f"utterance={body.text}"
    )


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        data = json.loads(match.group(0))
        if isinstance(data, dict):
            return data
    return {"reply": text, "proposed": {"type": "refuse"}}


async def _complete_chat(
    provider: str, base: str, model: str, api_key: Optional[str], user_text: str
) -> str:
    messages = [
        {"role": "system", "content": _system_prompt()},
        {"role": "user", "content": user_text},
    ]
    timeout = httpx.Timeout(20.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        if provider == "ollama":
            res = await client.post(
                f"{base}/api/chat",
                json={"model": model, "messages": messages, "stream": False},
            )
            res.raise_for_status()
            data = res.json()
            content = (data.get("message") or {}).get("content")
            if not isinstance(content, str):
                raise RuntimeError("ollama missing message.content")
            return content

        if provider == "anthropic":
            system = messages[0]["content"]
            res = await client.post(
                f"{base}/v1/messages",
                headers={
                    "x-api-key": api_key or "",
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": model,
                    "max_tokens": 1024,
                    "system": system,
                    "messages": [{"role": "user", "content": user_text}],
                },
            )
            res.raise_for_status()
            data = res.json()
            blocks = data.get("content") or []
            for b in blocks:
                if b.get("type") == "text" and isinstance(b.get("text"), str):
                    return b["text"]
            raise RuntimeError("anthropic missing text")

        url = f"{base}/chat/completions" if base.endswith("/v1") else f"{base}/v1/chat/completions"
        res = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={"model": model, "messages": messages},
        )
        res.raise_for_status()
        data = res.json()
        content = (((data.get("choices") or [{}])[0]).get("message") or {}).get("content")
        if not isinstance(content, str):
            raise RuntimeError("openai-compat missing content")
        return content


async def _fallback_llm(body: FallbackRequest) -> FallbackResponse:
    peek = _provider_env_peek()
    if not peek.get("configured"):
        return _degraded_llm_response(body, model="unconfigured")
    # Vision requests require an explicit vision-capable model env flag.
    if (body.imageBase64 or "").strip():
        vision_ok = (os.getenv("NOTLM_LLM_VISION") or "").strip().lower() in (
            "1",
            "true",
            "yes",
        )
        if not vision_ok:
            return FallbackResponse(
                reply=(
                    "I can’t view images unless a vision-capable LLM backup is enabled. "
                    "Describe the screen in text, or ask for a workflow step."
                )[:2000],
                proposed=FallbackProposed(type="refuse"),
                provider={"id": "llm", "model": "vision_unavailable"},
                exchangeId=str(uuid.uuid4()),
            )
    provider = str(peek["wire"])
    base = str(peek["base"])
    model = str(peek["model"])
    api_key = peek.get("api_key")
    provider_id = str(peek["provider_id"])
    user_blob = _user_blob(body)
    try:
        raw = await _complete_chat(provider, base, model, api_key, user_blob)
        parsed = _extract_json(raw)
    except Exception:  # noqa: BLE001
        return _degraded_llm_response(body, model="degraded")

    reply = str(parsed.get("reply") or "").strip()
    if not reply:
        reply = "I'm not sure how to help with that yet — try a workflow step name."
    proposed_raw = parsed.get("proposed")
    proposed: Optional[FallbackProposed] = None
    if isinstance(proposed_raw, dict) and proposed_raw.get("type") in (
        "faq",
        "goto",
        "meta",
        "refuse",
        "query",
        "mutation",
        "tour",
        "search",
    ):
        proposed = FallbackProposed(
            type=proposed_raw["type"],
            stepId=proposed_raw.get("stepId"),
            faqId=proposed_raw.get("faqId"),
            queryId=proposed_raw.get("queryId"),
            mutationId=proposed_raw.get("mutationId"),
            tourId=proposed_raw.get("tourId"),
            searchId=proposed_raw.get("searchId"),
            aliases=proposed_raw.get("aliases")
            if isinstance(proposed_raw.get("aliases"), list)
            else None,
        )
    else:
        proposed = FallbackProposed(type="refuse")

    proposed = _clamp_proposed(
        proposed,
        body.stepIds,
        query_ids=body.queryIds,
        mutation_ids=body.mutationIds,
        tour_ids=body.tourIds,
        search_ids=body.searchIds,
    )

    return FallbackResponse(
        reply=reply[:2000],
        proposed=proposed,
        provider={"id": provider_id, "model": model},
        exchangeId=str(uuid.uuid4()),
    )


async def probe_llm_status(*, enabled_flag: bool) -> dict[str, Any]:
    """Probe configured LLM/Ollama for admin status UI."""
    peek = _provider_env_peek()
    if not peek.get("configured"):
        return {
            "enabledFlag": enabled_flag,
            "configured": False,
            "reachable": False,
            "provider": None,
            "model": None,
            "endpointHint": None,
            "latencyMs": None,
            "error": peek.get("error") or "not configured",
        }
    provider_id = str(peek["provider_id"])
    base = str(peek["base"])
    model = str(peek["model"])
    hint = _endpoint_hint(base)
    started = time.perf_counter()
    timeout = httpx.Timeout(3.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            if provider_id == "ollama":
                res = await client.get(f"{base}/api/tags")
            else:
                # Cheap reachability: HEAD/GET base; treat 2xx/4xx as up, connect fail as down.
                res = await client.get(base)
            latency_ms = int((time.perf_counter() - started) * 1000)
            if res.status_code >= 500:
                return {
                    "enabledFlag": enabled_flag,
                    "configured": True,
                    "reachable": False,
                    "provider": provider_id,
                    "model": model,
                    "endpointHint": hint,
                    "latencyMs": latency_ms,
                    "error": f"HTTP {res.status_code}",
                }
            return {
                "enabledFlag": enabled_flag,
                "configured": True,
                "reachable": True,
                "provider": provider_id,
                "model": model,
                "endpointHint": hint,
                "latencyMs": latency_ms,
                "error": None,
            }
    except httpx.HTTPError as exc:
        latency_ms = int((time.perf_counter() - started) * 1000)
        return {
            "enabledFlag": enabled_flag,
            "configured": True,
            "reachable": False,
            "provider": provider_id,
            "model": model,
            "endpointHint": hint,
            "latencyMs": latency_ms,
            "error": str(exc),
        }


@router.get("/health")
async def notlm_fallback_health() -> dict[str, Any]:
    """Laya sidecar reachability (or degraded stub when down)."""
    provider = resolve_fallback_provider()
    if provider == "llm":
        return {"ok": True, "provider": "llm", "laya": {"reachable": False, "skipped": True}}

    url = f"{_laya_base_url()}/health"
    timeout = httpx.Timeout(3.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            res = await client.get(url)
            if res.is_success:
                payload = res.json()
                if isinstance(payload, dict):
                    return {"ok": True, "provider": "laya", "laya": payload}
            return {
                "ok": False,
                "provider": "laya",
                "laya": {"reachable": False, "status": res.status_code},
            }
    except httpx.HTTPError as exc:
        return {
            "ok": False,
            "provider": "laya",
            "laya": {"reachable": False, "error": str(exc)},
        }


@router.get("/llm-status")
async def notlm_llm_status(
    db: AsyncSession = Depends(get_session),
    _admin: User = Depends(get_admin_user),
) -> dict[str, Any]:
    """Admin-only Ollama/LLM reachability for System Settings status panel."""
    enabled = await _llm_fallback_flag_enabled(db)
    return await probe_llm_status(enabled_flag=enabled)


@router.post("", response_model=FallbackResponse)
async def notlm_fallback(
    body: FallbackRequest,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session),
) -> FallbackResponse:
    """Single-shot provider. Chain Laya→LLM in sealed @notlm, not here."""
    check_rate_limit(user.id)
    if resolve_fallback_provider(body.provider) == "llm":
        if not await _llm_fallback_flag_enabled(db):
            return _degraded_llm_response(body, model="flag_off")
        return await _fallback_llm(body)
    return await _proxy_laya(body)

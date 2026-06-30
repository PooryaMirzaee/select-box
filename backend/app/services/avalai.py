"""
کلاینت طراحی هوشمند — API سازگار با OpenAI (سرویس‌دهنده در لایه ادمین تنظیم می‌شود).
"""

from __future__ import annotations

import asyncio
import base64
import logging
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.services import settings as shop_settings
from app.services.ai_admin import get_system_prompt_suffix
from app.services.ai_errors import (
    AiServiceError,
    MSG_BUSY,
    MSG_NO_IMAGE,
    MSG_NOT_CONFIGURED,
    MSG_UNAVAILABLE,
)

logger = logging.getLogger(__name__)

AVALAI_BASE_URL = "https://api.avalai.ir/v1"
DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image"

# در صورت شلوغی، به ترتیب امتحان می‌شوند
_MODEL_FALLBACKS = (
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image-preview",
    "gpt-image-1",
)

_VISION_MODELS = (
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image-preview",
    "gemini-3-pro-image-preview",
)

_RETRY_DELAYS_SEC = (3.0, 8.0, 15.0, 25.0)
_MAX_ATTEMPTS = 4


def _api_key(db: Session) -> str:
    return shop_settings.avalai_raw_key(db)


def is_enabled(db: Session) -> bool:
    cfg = shop_settings.get_all_settings(db)
    raw = cfg.get("avalai_enabled", False)
    if isinstance(raw, str):
        enabled = raw.strip().lower() in ("1", "true", "yes", "on")
    else:
        enabled = bool(raw)
    return enabled and bool(_api_key(db))


def image_model(db: Session) -> str:
    model = str(shop_settings.get_setting(db, "avalai_image_model", DEFAULT_IMAGE_MODEL) or "").strip()
    return model or DEFAULT_IMAGE_MODEL


def _model_chain(primary: str) -> list[str]:
    chain = [primary]
    for m in _MODEL_FALLBACKS:
        if m not in chain:
            chain.append(m)
    return chain


def _vision_model_chain(primary: str) -> list[str]:
    chain = [m for m in _model_chain(primary) if not m.startswith("gpt-image")]
    for m in _VISION_MODELS:
        if m not in chain:
            chain.append(m)
    return chain or list(_VISION_MODELS)


def _build_text_prompt(db: Session, prompt: str) -> str:
    text = prompt.strip()
    if not text:
        raise ValueError("prompt is empty")
    suffix = get_system_prompt_suffix(db)
    return f"{text}\n\n{suffix}"


def _build_transform_prompt(db: Session, tool_prompt: str) -> str:
    text = tool_prompt.strip()
    if not text:
        raise ValueError("tool prompt is empty")
    suffix = get_system_prompt_suffix(db)
    return f"{text}\n\n{suffix}"


def _image_data_url(image_bytes: bytes, mime: str) -> str:
    b64 = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{mime};base64,{b64}"


def _build_chat_payload(model: str, user_prompt: str, aspect_ratio: str) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "model": model,
        "messages": [{"role": "user", "content": user_prompt}],
        "modalities": ["image", "text"],
    }
    if aspect_ratio and aspect_ratio != "1:1":
        payload["generationConfig"] = {"imageConfig": {"aspectRatio": aspect_ratio}}
    return payload


def _build_vision_payload(
    model: str,
    user_prompt: str,
    *,
    image_bytes: bytes,
    mime: str,
    aspect_ratio: str,
) -> dict[str, Any]:
    content: list[dict[str, Any]] = [
        {"type": "text", "text": user_prompt},
        {"type": "image_url", "image_url": {"url": _image_data_url(image_bytes, mime)}},
    ]
    payload: dict[str, Any] = {
        "model": model,
        "messages": [{"role": "user", "content": content}],
        "modalities": ["image", "text"],
    }
    if aspect_ratio and aspect_ratio != "1:1":
        payload["generationConfig"] = {"imageConfig": {"aspectRatio": aspect_ratio}}
    return payload


def _retry_delay(res: httpx.Response, attempt: int) -> float:
    retry_after = res.headers.get("Retry-After", "").strip()
    if retry_after.isdigit():
        return min(float(retry_after), 45.0)
    return _RETRY_DELAYS_SEC[min(attempt, len(_RETRY_DELAYS_SEC) - 1)]


async def _post_json(
    client: httpx.AsyncClient,
    url: str,
    *,
    headers: dict[str, str],
    payload: dict[str, Any],
) -> httpx.Response:
    last: httpx.Response | None = None
    for attempt in range(_MAX_ATTEMPTS):
        res = await client.post(url, headers=headers, json=payload)
        if res.status_code != 429:
            return res
        last = res
        logger.warning(
            "AI provider 429 model=%s attempt=%s body=%s",
            payload.get("model"),
            attempt + 1,
            res.text[:200],
        )
        if attempt < _MAX_ATTEMPTS - 1:
            await asyncio.sleep(_retry_delay(res, attempt))
    assert last is not None
    return last


def _extract_image_bytes(response: dict[str, Any]) -> bytes:
    choices = response.get("choices")
    if isinstance(choices, list) and choices:
        message = choices[0].get("message") or {}
        images = message.get("images")
        if isinstance(images, list) and images:
            image_url = images[0].get("image_url") or {}
            url = image_url.get("url") or ""
            if url.startswith("data:"):
                _header, b64_data = url.split(",", 1)
                return base64.b64decode(b64_data)

    data = response.get("data")
    if isinstance(data, list) and data:
        item = data[0]
        b64_json = item.get("b64_json")
        if b64_json:
            return base64.b64decode(b64_json)
        url = item.get("url")
        if isinstance(url, str) and url.startswith("http"):
            with httpx.Client(timeout=60.0) as sync_client:
                res = sync_client.get(url)
                res.raise_for_status()
                return res.content

    raise AiServiceError(MSG_NO_IMAGE, internal="response had no image payload")


def _map_http_error(res: httpx.Response, *, model: str) -> AiServiceError:
    body = res.text[:500]
    if res.status_code == 401:
        return AiServiceError(MSG_UNAVAILABLE, internal=f"401 invalid api key model={model}")
    if res.status_code == 402:
        return AiServiceError(MSG_UNAVAILABLE, internal=f"402 insufficient credit model={model}")
    if res.status_code == 429:
        return AiServiceError(MSG_BUSY, internal=f"429 rate limit model={model} body={body}", retryable=True)
    return AiServiceError(MSG_UNAVAILABLE, internal=f"{res.status_code} model={model} body={body}")


async def _generate_with_model(
    client: httpx.AsyncClient,
    *,
    headers: dict[str, str],
    model: str,
    user_prompt: str,
    aspect_ratio: str,
) -> bytes:
    if model.startswith("gpt-image"):
        payload = {
            "model": model,
            "prompt": user_prompt,
            "n": 1,
            "size": "1024x1024",
            "response_format": "b64_json",
        }
        res = await _post_json(
            client,
            f"{AVALAI_BASE_URL}/images/generations",
            headers=headers,
            payload=payload,
        )
    else:
        payload = _build_chat_payload(model, user_prompt, aspect_ratio)
        res = await _post_json(
            client,
            f"{AVALAI_BASE_URL}/chat/completions",
            headers=headers,
            payload=payload,
        )

    if res.status_code >= 400:
        raise _map_http_error(res, model=model)

    data = res.json()
    return _extract_image_bytes(data)


async def _transform_with_model(
    client: httpx.AsyncClient,
    *,
    headers: dict[str, str],
    model: str,
    user_prompt: str,
    image_bytes: bytes,
    mime: str,
    aspect_ratio: str,
) -> bytes:
    payload = _build_vision_payload(
        model,
        user_prompt,
        image_bytes=image_bytes,
        mime=mime,
        aspect_ratio=aspect_ratio,
    )
    res = await _post_json(
        client,
        f"{AVALAI_BASE_URL}/chat/completions",
        headers=headers,
        payload=payload,
    )
    if res.status_code >= 400:
        raise _map_http_error(res, model=model)
    return _extract_image_bytes(res.json())


async def generate_image(
    db: Session,
    *,
    prompt: str,
    aspect_ratio: str = "1:1",
) -> bytes:
    api_key = _api_key(db)
    if not api_key:
        raise AiServiceError(MSG_NOT_CONFIGURED, internal="api key missing")

    primary = image_model(db)
    user_prompt = _build_text_prompt(db, prompt)
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    models = _model_chain(primary)
    last_busy: AiServiceError | None = None

    async with httpx.AsyncClient(timeout=120.0) as client:
        for model in models:
            try:
                return await _generate_with_model(
                    client,
                    headers=headers,
                    model=model,
                    user_prompt=user_prompt,
                    aspect_ratio=aspect_ratio,
                )
            except AiServiceError as exc:
                if exc.retryable:
                    last_busy = exc
                    logger.warning("AI model %s rate-limited, trying fallback", model)
                    await asyncio.sleep(2.0)
                    continue
                raise

    if last_busy:
        raise last_busy
    raise AiServiceError(MSG_UNAVAILABLE, internal="all models failed")


async def transform_image(
    db: Session,
    *,
    image_bytes: bytes,
    mime: str,
    tool_prompt: str,
    aspect_ratio: str = "1:1",
) -> bytes:
    api_key = _api_key(db)
    if not api_key:
        raise AiServiceError(MSG_NOT_CONFIGURED, internal="api key missing")

    primary = image_model(db)
    user_prompt = _build_transform_prompt(db, tool_prompt)
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    models = _vision_model_chain(primary)
    last_busy: AiServiceError | None = None

    async with httpx.AsyncClient(timeout=120.0) as client:
        for model in models:
            try:
                return await _transform_with_model(
                    client,
                    headers=headers,
                    model=model,
                    user_prompt=user_prompt,
                    image_bytes=image_bytes,
                    mime=mime,
                    aspect_ratio=aspect_ratio,
                )
            except AiServiceError as exc:
                if exc.retryable:
                    last_busy = exc
                    logger.warning("AI vision model %s rate-limited, trying fallback", model)
                    await asyncio.sleep(2.0)
                    continue
                raise

    if last_busy:
        raise last_busy
    raise AiServiceError(MSG_UNAVAILABLE, internal="all vision models failed")

"""ذخیرهٔ فایل — محلی با fallback؛ MinIO اختیاری."""

from __future__ import annotations

import uuid
from pathlib import Path
from urllib.parse import quote

from app.core.config import settings

UPLOAD_ROOT = Path(settings.upload_dir).resolve()


def ensure_upload_root() -> None:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


def _safe_relative_path(relative_dir: str) -> Path:
    """مسیر نسبی امن — بدون path traversal."""
    clean = relative_dir.replace("\\", "/").strip("/")
    parts = [p for p in clean.split("/") if p and p not in (".", "..")]
    dest = UPLOAD_ROOT.joinpath(*parts).resolve()
    if not str(dest).startswith(str(UPLOAD_ROOT)):
        raise ValueError("Invalid upload path")
    return dest


def save_upload(file_bytes: bytes, relative_dir: str, filename: str) -> str:
    """ذخیره و برگرداندن storage_key نسبی."""
    ensure_upload_root()
    dest_dir = _safe_relative_path(relative_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex[:8]}_{Path(filename).name}"
    path = dest_dir / safe_name
    path.write_bytes(file_bytes)
    key_parts = relative_dir.replace("\\", "/").strip("/").split("/")
    key_parts = [p for p in key_parts if p and p not in (".", "..")]
    return "/".join([*key_parts, safe_name])


def save_upload_secure(file_bytes: bytes, relative_dir: str, storage_basename: str) -> str:
    """ذخیره با نام از پیش اعتبارسنجی‌شده (بدون اعتماد به نام کاربر)."""
    ensure_upload_root()
    dest_dir = _safe_relative_path(relative_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    basename = Path(storage_basename).name
    if basename != storage_basename or ".." in storage_basename:
        raise ValueError("Invalid storage basename")
    path = dest_dir / basename
    path.write_bytes(file_bytes)
    key_parts = relative_dir.replace("\\", "/").strip("/").split("/")
    key_parts = [p for p in key_parts if p and p not in (".", "..")]
    return "/".join([*key_parts, basename])


def resolve_local_path(storage_key: str) -> Path | None:
    """مسیر فایل فقط اگر داخل upload root باشد."""
    clean = storage_key.replace("\\", "/").lstrip("/")
    if ".." in clean.split("/"):
        return None
    parts = [p for p in clean.split("/") if p and p not in (".", "..")]
    try:
        p = UPLOAD_ROOT.joinpath(*parts).resolve()
    except (OSError, ValueError):
        return None
    if not str(p).startswith(str(UPLOAD_ROOT)):
        return None
    return p if p.is_file() else None


def public_url(storage_key: str) -> str:
    encoded_key = quote(storage_key, safe="/")
    return f"{settings.public_api_url.rstrip('/')}/api/v1/media/{encoded_key}"


def delete_upload(storage_key: str) -> None:
    p = resolve_local_path(storage_key)
    if p and p.is_file():
        p.unlink(missing_ok=True)

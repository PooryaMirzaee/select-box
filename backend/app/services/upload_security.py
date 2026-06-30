"""اعتبارسنجی آپلود فایل — magic bytes، پسوند و نام امن."""

from __future__ import annotations

import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.services.storage import save_upload_secure

BLOCKED_NAME_FRAGMENTS = (
    ".php",
    ".phtml",
    ".html",
    ".htm",
    ".js",
    ".mjs",
    ".exe",
    ".sh",
    ".bat",
    ".cmd",
    ".ps1",
    ".jar",
    ".zip",
    ".rar",
    ".7z",
    ".htaccess",
)

IMAGE_MAGIC: list[tuple[bytes, str, str]] = [
    (b"\xff\xd8\xff", "image/jpeg", ".jpg"),
    (b"\x89PNG\r\n\x1a\n", "image/png", ".png"),
    (b"GIF87a", "image/gif", ".gif"),
    (b"GIF89a", "image/gif", ".gif"),
]

FONT_MAGIC: list[tuple[bytes, str, str]] = [
    (b"wOFF", "font/woff", ".woff"),
    (b"wOF2", "font/woff2", ".woff2"),
    (b"\x00\x01\x00\x00", "font/ttf", ".ttf"),
    (b"OTTO", "font/otf", ".otf"),
    (b"\x00\x00\x01\x00", "font/ttf", ".ttf"),
]

ALLOWED_IMAGE_EXT = frozenset({".jpg", ".jpeg", ".png", ".gif", ".webp"})
ALLOWED_IMAGE_WITH_SVG_EXT = ALLOWED_IMAGE_EXT | {".svg"}
ALLOWED_FONT_EXT = frozenset({".woff", ".woff2", ".ttf", ".otf"})
ALLOWED_CHAT_EXT = ALLOWED_IMAGE_EXT | {".pdf"}


def sanitize_filename(filename: str) -> str:
    name = Path(filename or "file").name
    name = name.replace("\x00", "").strip()
    name = re.sub(r"[^\w.\-]", "_", name, flags=re.UNICODE)
    if not name or name in (".", ".."):
        name = "file"
    lower = name.lower()
    for bad in BLOCKED_NAME_FRAGMENTS:
        if bad in lower:
            name = re.sub(re.escape(bad), "_", name, flags=re.I)
    if name.count(".") > 1:
        base, ext = name.rsplit(".", 1)
        base = base.replace(".", "_")
        name = f"{base}.{ext}"
    return name[:120]


def _reject_dangerous_name(filename: str) -> None:
    lower = sanitize_filename(filename).lower()
    for bad in BLOCKED_NAME_FRAGMENTS:
        if lower.endswith(bad) or bad + "." in lower:
            raise HTTPException(status_code=400, detail="نام فایل مجاز نیست")


def _detect_image(data: bytes) -> tuple[str, str] | None:
    if len(data) < 12:
        return None
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp", ".webp"
    for sig, mime, ext in IMAGE_MAGIC:
        if data.startswith(sig):
            return mime, ext
    return None


def _detect_font(data: bytes) -> tuple[str, str] | None:
    if len(data) < 4:
        return None
    for sig, mime, ext in FONT_MAGIC:
        if data.startswith(sig):
            return mime, ext
    return None


def _validate_svg(data: bytes) -> tuple[str, str]:
    try:
        text = data.decode("utf-8", errors="ignore")[:8192].lower()
    except Exception:
        raise HTTPException(status_code=400, detail="فایل SVG نامعتبر است")
    if "<script" in text or "javascript:" in text or "onload=" in text:
        raise HTTPException(status_code=400, detail="فایل SVG حاوی محتوای خطرناک است")
    if "<svg" not in text and "<?xml" not in text:
        raise HTTPException(status_code=400, detail="فایل SVG نامعتبر است")
    return "image/svg+xml", ".svg"


def validate_image_bytes(
    data: bytes,
    filename: str,
    declared_mime: str | None,
    *,
    max_bytes: int,
    allow_svg: bool = False,
) -> tuple[str, str, str]:
    """برمی‌گرداند: (storage_basename, mime, ext)"""
    if not data:
        raise HTTPException(status_code=400, detail="فایل خالی است")
    if len(data) > max_bytes:
        raise HTTPException(status_code=400, detail="حجم فایل بیش از حد مجاز است")

    _reject_dangerous_name(filename)

    detected = _detect_image(data)
    if detected is None and allow_svg:
        head = data[:256].lstrip()
        if head.startswith(b"<") or head.startswith(b"<?xml"):
            detected = _validate_svg(data)

    if detected is None:
        raise HTTPException(
            status_code=400,
            detail="نوع فایل مجاز نیست — فقط تصویر (JPG, PNG, GIF, WebP" + (", SVG" if allow_svg else "") + ")",
        )

    mime, ext = detected
    allowed = ALLOWED_IMAGE_WITH_SVG_EXT if allow_svg else ALLOWED_IMAGE_EXT
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="نوع فایل مجاز نیست")

    if declared_mime and declared_mime not in (mime, "application/octet-stream"):
        allowed_declared = {
            "image/jpeg": {".jpg", ".jpeg"},
            "image/png": {".png"},
            "image/gif": {".gif"},
            "image/webp": {".webp"},
            "image/svg+xml": {".svg"},
        }
        ok_exts = allowed_declared.get(declared_mime.split(";")[0].strip())
        if ok_exts and ext not in ok_exts:
            raise HTTPException(status_code=400, detail="نوع MIME با محتوای فایل مطابقت ندارد")

    storage_name = f"{uuid.uuid4().hex}{ext}"
    return storage_name, mime, ext


def validate_font_bytes(
    data: bytes,
    filename: str,
    declared_mime: str | None,
    *,
    max_bytes: int,
) -> tuple[str, str, str]:
    if not data:
        raise HTTPException(status_code=400, detail="فایل خالی است")
    if len(data) > max_bytes:
        raise HTTPException(status_code=400, detail="حجم فایل بیش از حد مجاز است")

    _reject_dangerous_name(filename)

    detected = _detect_font(data)
    if detected is None:
        raise HTTPException(status_code=400, detail="فرمت فونت مجاز نیست (woff, woff2, ttf, otf)")

    mime, ext = detected
    if ext not in ALLOWED_FONT_EXT:
        raise HTTPException(status_code=400, detail="فرمت فونت مجاز نیست")

    storage_name = f"{uuid.uuid4().hex}{ext}"
    return storage_name, mime, ext


def validate_chat_bytes(
    data: bytes,
    filename: str,
    declared_mime: str | None,
    *,
    max_bytes: int,
) -> tuple[str, str, str]:
    if not data:
        raise HTTPException(status_code=400, detail="فایل خالی است")
    if len(data) > max_bytes:
        raise HTTPException(status_code=400, detail="حداکثر حجم فایل ۵ مگابایت")

    _reject_dangerous_name(filename)

    if data.startswith(b"%PDF-"):
        mime, ext = "application/pdf", ".pdf"
    else:
        detected = _detect_image(data)
        if detected is None:
            raise HTTPException(
                status_code=400,
                detail="نوع فایل مجاز نیست — فقط تصویر (JPG, PNG, GIF, WebP) یا PDF",
            )
        mime, ext = detected

    if ext not in ALLOWED_CHAT_EXT:
        raise HTTPException(status_code=400, detail="نوع فایل مجاز نیست")

    storage_name = f"{uuid.uuid4().hex}{ext}"
    return storage_name, mime, ext


async def read_upload_file(file: UploadFile, max_bytes: int) -> bytes:
    data = await file.read()
    if len(data) > max_bytes:
        raise HTTPException(status_code=400, detail="حجم فایل بیش از حد مجاز است")
    return data


async def secure_image_upload(
    file: UploadFile,
    relative_dir: str,
    *,
    max_bytes: int,
    allow_svg: bool = False,
) -> tuple[str, str]:
    """اعتبارسنجی و ذخیره تصویر — برمی‌گرداند (storage_key, mime)."""
    data = await read_upload_file(file, max_bytes)
    storage_name, mime, _ = validate_image_bytes(
        data,
        file.filename or "image",
        file.content_type,
        max_bytes=max_bytes,
        allow_svg=allow_svg,
    )
    key = save_upload_secure(data, relative_dir, storage_name)
    return key, mime


async def secure_font_upload(
    file: UploadFile,
    relative_dir: str,
    *,
    max_bytes: int,
    basename: str | None = None,
) -> tuple[str, str]:
    data = await read_upload_file(file, max_bytes)
    storage_name, mime, ext = validate_font_bytes(
        data,
        file.filename or "font",
        file.content_type,
        max_bytes=max_bytes,
    )
    if basename:
        safe = re.sub(r"[^\w.\-]", "_", basename.strip())[:80] or "font"
        storage_name = f"{safe}{ext}"
    key = save_upload_secure(data, relative_dir, storage_name)
    return key, mime

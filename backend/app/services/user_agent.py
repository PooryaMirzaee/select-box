"""تشخیص مرورگر، OS و نوع دستگاه از User-Agent."""

from __future__ import annotations


def parse_user_agent(ua: str | None) -> tuple[str | None, str | None, str | None]:
    if not ua:
        return None, None, None
    ua_l = ua.lower()
    browser = "Unknown"
    if "edg/" in ua_l or "edge" in ua_l:
        browser = "Edge"
    elif "chrome" in ua_l and "chromium" not in ua_l:
        browser = "Chrome"
    elif "firefox" in ua_l:
        browser = "Firefox"
    elif "safari" in ua_l and "chrome" not in ua_l:
        browser = "Safari"
    elif "opr" in ua_l or "opera" in ua_l:
        browser = "Opera"

    os_name = "Unknown"
    if "windows" in ua_l:
        os_name = "Windows"
    elif "mac os" in ua_l or "macintosh" in ua_l:
        os_name = "macOS"
    elif "android" in ua_l:
        os_name = "Android"
    elif "iphone" in ua_l or "ipad" in ua_l:
        os_name = "iOS"
    elif "linux" in ua_l:
        os_name = "Linux"

    device = "desktop"
    if "mobile" in ua_l or "iphone" in ua_l or "android" in ua_l:
        device = "mobile"
    elif "ipad" in ua_l or "tablet" in ua_l:
        device = "tablet"

    return browser, os_name, device

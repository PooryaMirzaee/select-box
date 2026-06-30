/** آدرس تصاویر آپلودشده — از پروکسی Next یا مستقیم API */

const API_BASE =
  typeof window === "undefined"
    ? (process.env.API_URL ?? "http://localhost:8000")
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");

/** `#` in uploaded filenames is treated as a URL fragment unless percent-encoded. */
export function encodeMediaPath(url: string): string {
  return url.replace(/#/g, "%23");
}

export function mediaUrl(urlOrKey: string | null | undefined): string {
  if (!urlOrKey) return "";
  if (urlOrKey.startsWith("http://") || urlOrKey.startsWith("https://")) {
    try {
      const u = new URL(encodeMediaPath(urlOrKey));
      if (u.pathname.startsWith("/api/v1/media/")) {
        const key = u.pathname.replace("/api/v1/media/", "");
        return encodeMediaPath(`/api/media/${key}`);
      }
    } catch {
      return urlOrKey;
    }
    return urlOrKey;
  }
  if (urlOrKey.startsWith("/api/media/")) return encodeMediaPath(urlOrKey);
  const key = urlOrKey.replace(/^\/+/, "");
  return encodeMediaPath(`/api/media/${key}`);
}

export function mediaUrls(urls: string[]): string[] {
  return urls.map((u) => mediaUrl(u)).filter(Boolean);
}

/** برای درخواست‌های سمت سرور که به API مستقیم نیاز دارند */
export function absoluteMediaUrl(urlOrKey: string | null | undefined): string {
  if (!urlOrKey) return "";
  if (urlOrKey.startsWith("http")) return urlOrKey;
  const key = urlOrKey.includes("/api/v1/media/")
    ? urlOrKey.split("/api/v1/media/")[1]
    : urlOrKey.replace(/^\/+/, "");
  return `${API_BASE}/api/v1/media/${key}`;
}

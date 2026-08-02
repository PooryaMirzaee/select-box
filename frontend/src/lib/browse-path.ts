/** Encode/decode مسیرهای browse با اسلاگ فارسی (برای جلوگیری از Location header 500) */

export function encodeBrowsePath(pathStr: string): string {
  return pathStr
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function decodeBrowsePath(segments?: string[] | null): string {
  return (segments ?? [])
    .map((part) => {
      const raw = part.trim();
      try {
        return decodeURIComponent(raw).trim();
      } catch {
        return raw;
      }
    })
    .filter(Boolean)
    .join("/");
}

export function browseHref(pathStr: string): string {
  if (!pathStr) return "/browse";
  return `/browse/${encodeBrowsePath(pathStr)}`;
}

/**
 * آدرس پایه API — یک منبع برای SSR و مرورگر.
 * در تولید NEXT_PUBLIC_API_URL خالی است → درخواست نسبی از همان دامنه.
 */

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/** مرورگر — خالی یعنی same-origin (پشت nginx) */
export function clientApiBase(): string {
  return stripTrailingSlash(process.env.NEXT_PUBLIC_API_URL || "");
}

/** سرور Next.js — داخل Docker به سرویس api */
export function serverApiBase(): string {
  return stripTrailingSlash(
    process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  );
}

export function apiBase(): string {
  return typeof window === "undefined" ? serverApiBase() : clientApiBase();
}

/** URL کامل برای fetch در مرورگر یا سرور */
export function apiUrl(path: string): string {
  const base = apiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

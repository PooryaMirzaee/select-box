/**
 * آنالیتیکس داخلی CORALAY — بدون وابستگی به GA.
 */

import { apiFetch } from "@/lib/api";
import { apiBase } from "@/lib/api-base";
import { STORAGE_KEYS } from "@/lib/storage-keys";

const API_URL = apiBase();

export type AnalyticsOverview = {
  page_views: number;
  sessions: number;
  unique_visitors: number;
  bounce_rate: number;
  avg_pages_per_session: number;
  avg_session_duration_sec: number;
  online_now: number;
  events_total: number;
};

export type AnalyticsTimeseriesPoint = {
  date: string;
  page_views: number;
  sessions: number;
  unique_visitors: number;
};

export type AnalyticsRankedItem = {
  label: string;
  count: number;
  percentage: number;
};

export type AnalyticsPageItem = {
  path: string;
  page_title: string | null;
  views: number;
  unique_sessions: number;
};

export type AnalyticsRealtime = {
  online_now: number;
  active_pages: AnalyticsRankedItem[];
  recent_paths: string[];
};

export type CollectPayload = {
  session_id: string;
  visitor_id?: string | null;
  path: string;
  page_title?: string | null;
  referrer?: string | null;
  referrer_path?: string | null;
  screen_width?: number | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  event_name?: string | null;
  event_data?: Record<string, unknown> | null;
};

export type AnalyticsEventName =
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "purchase"
  | "product_view"
  | "search"
  | "signup"
  | "login";

export function getOrCreateAnalyticsSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(STORAGE_KEYS.analyticsSessionId);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEYS.analyticsSessionId, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function getVisitorId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.chatVisitorId);
  } catch {
    return null;
  }
}

function parseUtm(): Pick<CollectPayload, "utm_source" | "utm_medium" | "utm_campaign"> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
  };
}

function buildPayload(
  path: string,
  extra?: Partial<CollectPayload>,
): CollectPayload {
  return {
    session_id: getOrCreateAnalyticsSessionId(),
    visitor_id: getVisitorId(),
    path,
    page_title: typeof document !== "undefined" ? document.title : null,
    referrer: typeof document !== "undefined" ? document.referrer || null : null,
    referrer_path: null,
    screen_width: typeof window !== "undefined" ? window.innerWidth : null,
    ...parseUtm(),
    ...extra,
  };
}

export async function collectPageView(path: string): Promise<void> {
  if (!path || path.startsWith("/admin")) return;
  const payload = buildPayload(path);
  try {
    await apiFetch<{ ok: boolean }>("/api/v1/analytics/collect", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    /* silent — analytics must not break UX */
  }
}

export async function sendHeartbeat(): Promise<void> {
  const sessionId = getOrCreateAnalyticsSessionId();
  if (!sessionId) return;
  try {
    await apiFetch("/api/v1/analytics/heartbeat", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    });
  } catch {
    /* silent */
  }
}

export function trackEvent(
  eventName: AnalyticsEventName,
  path: string,
  eventData?: Record<string, unknown>,
): void {
  if (!path || path.startsWith("/admin")) return;
  const payload = buildPayload(path, { event_name: eventName, event_data: eventData ?? null });
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(`${API_URL}/api/v1/analytics/collect`, blob);
    return;
  }

  void apiFetch("/api/v1/analytics/collect", { method: "POST", body }).catch(() => {});
}

export function beaconPageView(path: string): void {
  if (!path || path.startsWith("/admin")) return;
  const payload = buildPayload(path);
  const body = JSON.stringify(payload);
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(`${API_URL}/api/v1/analytics/collect`, new Blob([body], { type: "application/json" }));
  }
}

export async function fetchAnalyticsOverview(token: string, days = 7) {
  return adminFetchAnalytics<AnalyticsOverview>(`/api/v1/admin/analytics/overview?days=${days}`, token);
}

export async function fetchAnalyticsTimeseries(token: string, days = 30) {
  return adminFetchAnalytics<AnalyticsTimeseriesPoint[]>(
    `/api/v1/admin/analytics/timeseries?days=${days}`,
    token,
  );
}

export async function fetchAnalyticsPages(token: string, days = 7) {
  return adminFetchAnalytics<AnalyticsPageItem[]>(`/api/v1/admin/analytics/pages?days=${days}`, token);
}

export async function fetchAnalyticsReferrers(token: string, days = 7) {
  return adminFetchAnalytics<AnalyticsRankedItem[]>(
    `/api/v1/admin/analytics/referrers?days=${days}`,
    token,
  );
}

export async function fetchAnalyticsLandingPages(token: string, days = 7) {
  return adminFetchAnalytics<AnalyticsRankedItem[]>(
    `/api/v1/admin/analytics/landing-pages?days=${days}`,
    token,
  );
}

export async function fetchAnalyticsDevices(token: string, days = 7) {
  return adminFetchAnalytics<AnalyticsRankedItem[]>(`/api/v1/admin/analytics/devices?days=${days}`, token);
}

export async function fetchAnalyticsBrowsers(token: string, days = 7) {
  return adminFetchAnalytics<AnalyticsRankedItem[]>(`/api/v1/admin/analytics/browsers?days=${days}`, token);
}

export async function fetchAnalyticsOs(token: string, days = 7) {
  return adminFetchAnalytics<AnalyticsRankedItem[]>(`/api/v1/admin/analytics/os?days=${days}`, token);
}

export async function fetchAnalyticsEvents(token: string, days = 7) {
  return adminFetchAnalytics<AnalyticsRankedItem[]>(`/api/v1/admin/analytics/events?days=${days}`, token);
}

export async function fetchAnalyticsUtm(token: string, days = 7) {
  return adminFetchAnalytics<AnalyticsRankedItem[]>(`/api/v1/admin/analytics/utm?days=${days}`, token);
}

export async function fetchAnalyticsRealtime(token: string) {
  return adminFetchAnalytics<AnalyticsRealtime>("/api/v1/admin/analytics/realtime", token);
}

async function adminFetchAnalytics<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? "خطا در بارگذاری آمار");
  }
  return res.json() as Promise<T>;
}

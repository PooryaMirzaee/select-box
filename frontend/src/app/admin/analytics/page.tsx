"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Loader2 } from "@/components/icons";
import {
  type AnalyticsOverview,
  type AnalyticsPageItem,
  type AnalyticsRankedItem,
  type AnalyticsRealtime,
  type AnalyticsTimeseriesPoint,
  fetchAnalyticsBrowsers,
  fetchAnalyticsDevices,
  fetchAnalyticsEvents,
  fetchAnalyticsLandingPages,
  fetchAnalyticsOs,
  fetchAnalyticsOverview,
  fetchAnalyticsPages,
  fetchAnalyticsRealtime,
  fetchAnalyticsReferrers,
  fetchAnalyticsTimeseries,
  fetchAnalyticsUtm,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";

const PERIODS = [
  { label: "۷ روز", days: 7 },
  { label: "۳۰ روز", days: 30 },
  { label: "۹۰ روز", days: 90 },
] as const;

function fmt(n: number) {
  return new Intl.NumberFormat("fa-IR").format(n);
}

function fmtPct(n: number) {
  return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(n * 100)}٪`;
}

function fmtDuration(sec: number) {
  if (sec < 60) return `${fmt(Math.round(sec))} ثانیه`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${fmt(m)}:${String(s).padStart(2, "0")} دقیقه`;
}

function fmtDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("fa-IR", { month: "short", day: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function RankedList({ items, empty = "داده‌ای نیست" }: { items: AnalyticsRankedItem[]; empty?: string }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  const max = items[0]?.count ?? 1;
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="truncate" title={item.label}>
              {item.label}
            </span>
            <span className="shrink-0 text-muted">
              {fmt(item.count)} ({fmt(item.percentage)}٪)
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-muted)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all"
              style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TimeseriesChart({ data }: { data: AnalyticsTimeseriesPoint[] }) {
  const max = useMemo(() => Math.max(...data.map((d) => d.page_views), 1), [data]);
  if (!data.length) return <p className="py-10 text-center text-sm text-muted">داده‌ای برای نمودار نیست</p>;

  return (
    <div className="flex h-48 items-end gap-1 overflow-x-auto pb-1">
      {data.map((point) => (
        <div key={point.date} className="flex min-w-[2rem] flex-1 flex-col items-center gap-1">
          <div
            className="w-full max-w-[2.5rem] rounded-t-md bg-[var(--accent)]/80 transition-all hover:bg-[var(--accent)]"
            style={{ height: `${Math.max(4, (point.page_views / max) * 100)}%` }}
            title={`${fmt(point.page_views)} بازدید — ${fmtDate(point.date)}`}
          />
          <span className="text-[10px] text-muted">{fmtDate(point.date)}</span>
        </div>
      ))}
    </div>
  );
}

function PagesTable({ pages }: { pages: AnalyticsPageItem[] }) {
  if (!pages.length) return <p className="py-6 text-center text-sm text-muted">صفحه‌ای ثبت نشده</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-theme text-right text-muted">
            <th className="py-2 font-normal">صفحه</th>
            <th className="py-2 font-normal">بازدید</th>
            <th className="py-2 font-normal">نشست</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.path} className="border-b border-theme/50">
              <td className="max-w-[16rem] py-2.5">
                <p className="truncate font-medium" dir="ltr" title={p.path}>
                  {p.path}
                </p>
                {p.page_title ? <p className="truncate text-xs text-muted">{p.page_title}</p> : null}
              </td>
              <td className="py-2.5">{fmt(p.views)}</td>
              <td className="py-2.5">{fmt(p.unique_sessions)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [timeseries, setTimeseries] = useState<AnalyticsTimeseriesPoint[]>([]);
  const [pages, setPages] = useState<AnalyticsPageItem[]>([]);
  const [referrers, setReferrers] = useState<AnalyticsRankedItem[]>([]);
  const [landing, setLanding] = useState<AnalyticsRankedItem[]>([]);
  const [devices, setDevices] = useState<AnalyticsRankedItem[]>([]);
  const [browsers, setBrowsers] = useState<AnalyticsRankedItem[]>([]);
  const [osList, setOsList] = useState<AnalyticsRankedItem[]>([]);
  const [events, setEvents] = useState<AnalyticsRankedItem[]>([]);
  const [utm, setUtm] = useState<AnalyticsRankedItem[]>([]);
  const [realtime, setRealtime] = useState<AnalyticsRealtime | null>(null);

  const token = () => localStorage.getItem("coralay_admin_token")!;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const t = token();
    try {
      const [
        ov,
        ts,
        pg,
        ref,
        land,
        dev,
        br,
        os,
        ev,
        utmData,
        rt,
      ] = await Promise.all([
        fetchAnalyticsOverview(t, days),
        fetchAnalyticsTimeseries(t, Math.max(days, 30)),
        fetchAnalyticsPages(t, days),
        fetchAnalyticsReferrers(t, days),
        fetchAnalyticsLandingPages(t, days),
        fetchAnalyticsDevices(t, days),
        fetchAnalyticsBrowsers(t, days),
        fetchAnalyticsOs(t, days),
        fetchAnalyticsEvents(t, days),
        fetchAnalyticsUtm(t, days),
        fetchAnalyticsRealtime(t),
      ]);
      setOverview(ov);
      setTimeseries(ts);
      setPages(pg);
      setReferrers(ref);
      setLanding(land);
      setDevices(dev);
      setBrowsers(br);
      setOsList(os);
      setEvents(ev);
      setUtm(utmData);
      setRealtime(rt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در بارگذاری آمار");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchAnalyticsRealtime(token())
        .then(setRealtime)
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  const cards = overview
    ? [
        { label: "بازدید صفحه", value: fmt(overview.page_views) },
        { label: "نشست", value: fmt(overview.sessions) },
        { label: "بازدیدکننده یکتا", value: fmt(overview.unique_visitors) },
        { label: "آنلاین الان", value: fmt(realtime?.online_now ?? overview.online_now) },
        { label: "نرخ پرش", value: fmtPct(overview.bounce_rate) },
        { label: "میانگین صفحه/نشست", value: fmt(overview.avg_pages_per_session) },
        { label: "میانگین مدت نشست", value: fmtDuration(overview.avg_session_duration_sec) },
        { label: "رویدادها", value: fmt(overview.events_total) },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">آمار و آنالیتیکس</h1>
          <p className="mt-1 text-sm text-muted">سیستم داخلی — بدون نیاز به Google Analytics</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setDays(p.days)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition",
                days === p.days
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-theme text-muted hover:text-[var(--fg)]",
              )}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full border border-theme px-4 py-2 text-sm text-muted hover:text-[var(--fg)]"
          >
            بروزرسانی
          </button>
        </div>
      </div>

      {loading && !overview ? (
        <div className="flex items-center justify-center gap-2 py-20 text-muted">
          <Loader2 size={22} />
          در حال بارگذاری...
        </div>
      ) : null}

      {error ? (
        <div className="card-theme border-red-500/30 p-4 text-sm text-red-500">{error}</div>
      ) : null}

      {overview ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <div key={c.label} className="card-theme p-5">
                <p className="text-sm text-muted">{c.label}</p>
                <p className="mt-2 text-2xl font-semibold">{c.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="card-theme p-6 lg:col-span-2">
              <h2 className="font-semibold">روند بازدید</h2>
              <p className="mt-1 text-xs text-muted">تعداد بازدید صفحه در بازهٔ انتخاب‌شده</p>
              <div className="mt-6">
                <TimeseriesChart data={timeseries} />
              </div>
            </div>

            <div className="card-theme p-6">
              <h2 className="font-semibold">آنلاین (۵ دقیقه اخیر)</h2>
              <p className="mt-4 text-4xl font-semibold text-[var(--accent)]">
                {fmt(realtime?.online_now ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted">کاربر فعال</p>
              <div className="mt-6">
                <h3 className="mb-3 text-sm text-muted">صفحات فعال</h3>
                <RankedList items={realtime?.active_pages ?? []} empty="کسی آنلاین نیست" />
              </div>
            </div>
          </div>

          <div className="card-theme p-6">
            <h2 className="font-semibold">پربازدیدترین صفحات</h2>
            <div className="mt-4">
              <PagesTable pages={pages} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card-theme p-6">
              <h2 className="font-semibold">منابع ارجاع</h2>
              <div className="mt-4">
                <RankedList items={referrers} />
              </div>
            </div>
            <div className="card-theme p-6">
              <h2 className="font-semibold">صفحات ورود (Landing)</h2>
              <div className="mt-4">
                <RankedList items={landing} />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="card-theme p-6">
              <h2 className="font-semibold">دستگاه</h2>
              <div className="mt-4">
                <RankedList items={devices} />
              </div>
            </div>
            <div className="card-theme p-6">
              <h2 className="font-semibold">مرورگر</h2>
              <div className="mt-4">
                <RankedList items={browsers} />
              </div>
            </div>
            <div className="card-theme p-6">
              <h2 className="font-semibold">سیستم‌عامل</h2>
              <div className="mt-4">
                <RankedList items={osList} />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card-theme p-6">
              <h2 className="font-semibold">کمپین UTM</h2>
              <div className="mt-4">
                <RankedList items={utm} empty="کمپینی ثبت نشده" />
              </div>
            </div>
            <div className="card-theme p-6">
              <h2 className="font-semibold">رویدادهای فروشگاه</h2>
              <p className="mt-1 text-xs text-muted">مثل add_to_cart، purchase و ...</p>
              <div className="mt-4">
                <RankedList items={events} empty="رویدادی ثبت نشده" />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

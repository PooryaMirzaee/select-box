import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type AuthStatus, type Health } from "../lib/api";
import { StatusBadge } from "../lib/StatusBadge";

export function DashboardPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [counts, setCounts] = useState({ total: 0, published: 0, draft: 0 });
  const [channelCount, setChannelCount] = useState(0);

  useEffect(() => {
    api.health().then(setHealth).catch(console.error);
    api.authStatus().then(setAuth).catch(console.error);
    api.products().then((items) => {
      setCounts({
        total: items.length,
        published: items.filter((p) => p.status === "published").length,
        draft: items.filter((p) => p.status === "draft").length,
      });
    }).catch(() => {});
    api.channels().then((ch) => setChannelCount(ch.filter((c) => c.enabled).length)).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">داشبورد</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="کل محصولات" value={counts.total} />
        <StatCard title="منتشر شده" value={counts.published} accent="text-emerald-600" />
        <StatCard title="پیش‌نویس" value={counts.draft} accent="text-amber-600" />
        <StatCard title="کانال فعال" value={channelCount} accent="text-[var(--color-brand)]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-5">
          <h2 className="font-semibold mb-3">وضعیت اتصال</h2>
          {health ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <StatusBadge status={health.api_ok ? "success" : "failed"} />
                <span>API: {health.api_url}</span>
              </div>
              {!health.api_ok && health.error && (
                <p className="text-red-600 text-xs">{health.error}</p>
              )}
            </div>
          ) : (
            <p className="text-[var(--color-muted)] text-sm">در حال بررسی...</p>
          )}
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-white p-5">
          <h2 className="font-semibold mb-3">احراز هویت</h2>
          {auth?.logged_in ? (
            <div className="text-sm space-y-1">
              <p>وارد شده: <strong>{auth.phone}</strong></p>
              <p className="text-[var(--color-muted)]">نقش: {auth.role}</p>
            </div>
          ) : (
            <div className="text-sm">
              <p className="text-amber-700 mb-2">هنوز وارد نشده‌اید</p>
              <Link
                to="/publish"
                className="text-[var(--color-brand)] font-medium hover:underline"
              >
                ورود از صفحه انتشار ←
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <Link
          to="/publish"
          className="rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-white text-sm font-medium hover:bg-[var(--color-brand-dark)]"
        >
          انتشار محصول
        </Link>
        <Link
          to="/products"
          className="rounded-lg border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
        >
          مشاهده محصولات
        </Link>
      </div>
    </div>
  );
}

function StatCard({ title, value, accent }: { title: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-5">
      <div className="text-sm text-[var(--color-muted)]">{title}</div>
      <div className={`text-3xl font-bold mt-1 ${accent ?? ""}`}>{value.toLocaleString("fa-IR")}</div>
    </div>
  );
}

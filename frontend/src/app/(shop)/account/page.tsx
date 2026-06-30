"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AccountOrders } from "@/components/account/AccountOrders";
import { OtpLoginForm } from "@/components/auth/OtpLoginForm";
import { StudioProfileEditor } from "@/components/studio/StudioProfileEditor";
import { Button } from "@/components/ui/Button";
import { fetchMyProducts, fetchMyEarnings, type MyProduct } from "@/lib/customizer";
import { fetchMyStudio, studioPath, type MyStudio } from "@/lib/studio";
import { mediaUrl } from "@/lib/media";
import { fetchMe, logout, updateProfile, type AuthUser } from "@/lib/auth";
import { getAuthToken } from "@/lib/cart-session";
import { cn, formatToman } from "@/lib/utils";

type Tab = "overview" | "orders" | "studio" | "profile";

export default function AccountPage() {
  const [me, setMe] = useState<AuthUser | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [studio, setStudio] = useState<MyStudio | null>(null);
  const [earnings, setEarnings] = useState<{
    total_earned: string;
    pending: string;
    sales_count: number;
  } | null>(null);
  const [products, setProducts] = useState<MyProduct[]>([]);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setMe(null);
      setLoading(false);
      return;
    }
    const user = await fetchMe(token);
    setMe(user);
    if (!user) {
      setLoading(false);
      return;
    }
    setProfileName(user.full_name ?? "");
    setProfileEmail(user.email ?? "");
    try {
      const s = await fetchMyStudio(token);
      setStudio(s);
    } catch {
      setStudio(null);
    }
    if (user.is_creator) {
      try {
        setEarnings(await fetchMyEarnings(token));
      } catch {
        setEarnings(null);
      }
      try {
        setProducts(await fetchMyProducts(token));
      } catch {
        setProducts([]);
      }
    } else {
      setEarnings(null);
      setProducts([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function saveProfile() {
    setProfileMsg(null);
    try {
      const next = await updateProfile({
        full_name: profileName.trim() || null,
        email: profileEmail.trim() || null,
      });
      setMe(next);
      setProfileMsg("ذخیره شد");
    } catch (e) {
      setProfileMsg(e instanceof Error ? e.message : "خطا");
    }
  }

  function handleLogout() {
    logout();
    setMe(null);
    setStudio(null);
    setTab("overview");
  }

  const tabs: { id: Tab; label: string; show?: boolean }[] = [
    { id: "overview", label: "خلاصه" },
    { id: "orders", label: "سفارش‌ها" },
    { id: "studio", label: "استودیو و آثار", show: me?.is_creator },
    { id: "profile", label: "پروفایل" },
  ];

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted">در حال بارگذاری…</div>;
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-3xl font-semibold">حساب کاربری</h1>
        <p className="mt-2 text-sm text-muted">
          با شماره موبایل وارد شوید — سفارش‌ها، استودیو و ویترین در یک حساب
        </p>
        <div className="mt-8 rounded-2xl border-2 border-[var(--fg)] bg-[var(--bg-elevated)] p-6 shadow-[4px_4px_0_0_var(--fg)]">
          <OtpLoginForm onSuccess={() => void loadDashboard()} />
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/admin/login" className="underline">
            ورود مدیر
          </Link>
        </p>
      </div>
    );
  }

  const displayName = me.full_name?.trim() || me.phone;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{displayName}</h1>
          <p className="mt-1 text-sm text-muted">{me.phone}</p>
          {me.is_creator ? (
            <span className="mt-2 inline-block rounded-full border border-theme px-2 py-0.5 text-xs text-[var(--accent)]">
              خالق
            </span>
          ) : (
            <span className="mt-2 inline-block rounded-full border border-theme px-2 py-0.5 text-xs text-muted">
              خریدار
            </span>
          )}
        </div>
        <button type="button" className="text-sm text-muted underline" onClick={handleLogout}>
          خروج
        </button>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2 border-b border-theme pb-2">
        {tabs
          .filter((t) => t.show !== false)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                tab === t.id ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "text-muted hover:text-[var(--fg)]",
              )}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
      </nav>

      {tab === "overview" && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-theme p-4">
              <p className="text-xs text-muted">سفارش‌ها</p>
              <p className="text-2xl font-bold">{me.order_count}</p>
            </div>
            {me.is_creator && studio ? (
              <>
                <div className="rounded-xl border border-theme p-4">
                  <p className="text-xs text-muted">در ویترین</p>
                  <p className="text-2xl font-bold text-green-600">{studio.published_count}</p>
                </div>
                <div className="rounded-xl border border-theme p-4">
                  <p className="text-xs text-muted">در انتظار تأیید</p>
                  <p className="text-2xl font-bold text-amber-600">{studio.pending_count}</p>
                </div>
              </>
            ) : null}
          </div>
          {studio ? (
            <Link href={studioPath(studio.profile)} className="text-sm font-medium text-[var(--accent)] hover:underline">
              مشاهده استودیوی عمومی ←
            </Link>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Link href="/customize">
              <Button>Design Lab</Button>
            </Link>
            <Link href="/studios">
              <Button variant="outline">ویترین خالقین</Button>
            </Link>
          </div>
        </div>
      )}

      {tab === "orders" && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">سفارش‌های من</h2>
          <p className="mt-1 text-sm text-muted">سفارش‌هایی که با این حساب ثبت کرده‌اید</p>
          <div className="mt-4">
            <AccountOrders />
          </div>
        </div>
      )}

      {tab === "studio" && me.is_creator && (
        <div className="mt-6 space-y-6">
          {studio ? <StudioProfileEditor data={studio} onUpdated={(n) => setStudio(n)} /> : null}
          {earnings ? (
            <div className="rounded-2xl border border-theme p-6">
              <h2 className="text-lg font-semibold">درآمد ویترین</h2>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted">کل</dt>
                  <dd className="text-xl font-bold">{formatToman(earnings.total_earned)}</dd>
                </div>
                <div>
                  <dt className="text-muted">در انتظار</dt>
                  <dd className="text-xl font-bold">{formatToman(earnings.pending)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted">خرید</dt>
                  <dd className="text-xl font-bold">{earnings.sales_count}</dd>
                </div>
              </dl>
            </div>
          ) : null}
          <div className="rounded-2xl border border-theme p-6">
            <h2 className="text-lg font-semibold">آثار من</h2>
            {products.length === 0 ? (
              <p className="mt-3 text-sm text-muted">هنوز اثری ثبت نکرده‌اید.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {products.map((p) => (
                  <li key={p.id} className="flex gap-3 rounded-xl border border-theme p-3">
                    {p.preview_url ? (
                      <img
                        src={mediaUrl(p.preview_url) ?? p.preview_url}
                        alt=""
                        className="h-14 w-14 rounded-lg object-cover"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      {p.status === "published" ? (
                        <Link href={`/product/${p.slug}`} className="font-medium hover:text-[var(--accent)]">
                          {p.title}
                        </Link>
                      ) : (
                        <p className="font-medium">{p.title}</p>
                      )}
                      <p className="text-xs text-muted">
                        {p.status === "published" ? "در ویترین" : "در انتظار تأیید"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "profile" && (
        <div className="mt-6 rounded-2xl border border-theme p-6">
          <h2 className="text-lg font-semibold">اطلاعات حساب</h2>
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-semibold uppercase text-muted">نام</label>
            <input
              className="w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
            />
            <label className="block text-xs font-semibold uppercase text-muted">ایمیل (اختیاری)</label>
            <input
              type="email"
              className="w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
            />
            <p className="text-xs text-muted">شماره: {me.phone}</p>
          </div>
          {profileMsg ? <p className="mt-2 text-sm text-[var(--accent)]">{profileMsg}</p> : null}
          <Button className="mt-4" onClick={() => void saveProfile()}>
            ذخیره
          </Button>
        </div>
      )}
    </div>
  );
}

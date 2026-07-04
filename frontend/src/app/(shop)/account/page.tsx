"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AccountOrders } from "@/components/account/AccountOrders";
import { OtpLoginForm } from "@/components/auth/OtpLoginForm";
import { Button } from "@/components/ui/Button";
import { fetchMe, logout, updateProfile, type AuthUser } from "@/lib/auth";
import { getAuthToken } from "@/lib/cart-session";
import { cn } from "@/lib/utils";

type Tab = "overview" | "orders" | "profile";

export default function AccountPage() {
  const [me, setMe] = useState<AuthUser | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
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
    if (user) {
      setProfileName(user.full_name ?? "");
      setProfileEmail(user.email ?? "");
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
    setTab("overview");
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "خلاصه" },
    { id: "orders", label: "سفارش‌ها" },
    { id: "profile", label: "پروفایل" },
  ];

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted">در حال بارگذاری…</div>;
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-3xl font-semibold">حساب کاربری</h1>
        <p className="mt-2 text-sm text-muted">با شماره موبایل وارد شوید — سفارش‌ها و پروفایل در یک حساب</p>
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
        </div>
        <button type="button" className="text-sm text-muted underline" onClick={handleLogout}>
          خروج
        </button>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2 border-b border-theme pb-2">
        {tabs.map((t) => (
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-theme p-4">
              <p className="text-xs text-muted">سفارش‌ها</p>
              <p className="text-2xl font-bold">{me.order_count}</p>
            </div>
            <div className="rounded-xl border border-theme p-4">
              <p className="text-xs text-muted">وضعیت حساب</p>
              <p className="text-lg font-semibold text-green-600">فعال</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/catalog">
              <Button>مشاهده محصولات</Button>
            </Link>
            <Link href="/orders">
              <Button variant="outline">پیگیری سفارش</Button>
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

      {tab === "profile" && (
        <div className="mt-6 space-y-4">
          <h2 className="text-lg font-semibold">ویرایش پروفایل</h2>
          <label className="block text-sm">
            نام
            <input
              className="input-theme mt-1 w-full"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            ایمیل
            <input
              className="input-theme mt-1 w-full"
              type="email"
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
            />
          </label>
          {profileMsg ? <p className="text-sm text-muted">{profileMsg}</p> : null}
          <Button onClick={() => void saveProfile()}>ذخیره</Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SelectBoxLogo } from "@/components/brand/SelectBoxLogo";
import { adminLogin } from "@/lib/api";
import { setAdminToken } from "@/lib/cart-session";

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phone.trim() || !password) {
      setError("شماره موبایل و رمز عبور را وارد کنید");
      return;
    }
    setLoading(true);
    try {
      const data = await adminLogin(phone.trim(), password);
      setAdminToken(data.access_token);
      router.push("/admin");
    } catch {
      setError("ورود ناموفق — شماره یا رمز اشتباه است");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6">
      <div className="hero-accent-glow pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div className="absolute end-6 top-6">
        <ThemeToggle />
      </div>
      <form
        onSubmit={submit}
        className="card-theme relative w-full max-w-sm space-y-5 p-8"
        autoComplete="on"
      >
        <div className="flex flex-col items-center text-center">
          <SelectBoxLogo href="/" size="lg" />
          <p className="mt-4 text-xs tracking-[0.2em] text-muted">ADMIN</p>
          <h1 className="mt-2 text-2xl font-semibold">ورود پنل مدیریت</h1>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">شماره موبایل</span>
          <input
            className="input-theme"
            name="username"
            type="tel"
            inputMode="numeric"
            autoComplete="username"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09xxxxxxxxx"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">رمز عبور</span>
          <input
            type="password"
            name="password"
            className="input-theme"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </label>
        {error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "در حال ورود…" : "ورود"}
        </Button>
      </form>
    </div>
  );
}

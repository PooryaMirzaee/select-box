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
  const [phone, setPhone] = useState("09120000000");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const data = await adminLogin(phone, password);
      setAdminToken(data.access_token);
      router.push("/admin");
    } catch {
      setError(
        "ورود ناموفق — بک‌اند را اجرا کنید یا از 09120000000 / admin123 استفاده کنید",
      );
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6">
      <div className="hero-accent-glow pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div className="absolute end-6 top-6">
        <ThemeToggle />
      </div>
      <form onSubmit={submit} className="card-theme relative w-full max-w-sm space-y-5 p-8">
        <div className="flex flex-col items-center text-center">
          <SelectBoxLogo href="/" size="lg" />
          <p className="mt-4 text-xs tracking-[0.2em] text-muted">ADMIN</p>
          <h1 className="mt-2 text-2xl font-semibold">ورود پنل مدیریت</h1>
        </div>
        <input
          className="input-theme"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="موبایل"
        />
        <input
          type="password"
          className="input-theme"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="رمز"
        />
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <Button type="submit" className="w-full">
          ورود
        </Button>
      </form>
    </div>
  );
}

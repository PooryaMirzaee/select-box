"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { OtpLoginForm } from "@/components/auth/OtpLoginForm";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/account";

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-semibold">ورود</h1>
      <p className="mt-2 text-sm text-muted">ورود با کد یک‌بارمصرف پیامکی — برای خریداران و خالقین یکسان است</p>
      <div className="mt-8 rounded-2xl border-2 border-[var(--fg)] bg-[var(--bg-elevated)] p-6 shadow-[4px_4px_0_0_var(--fg)]">
        <OtpLoginForm onSuccess={() => router.replace(next)} />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/" className="hover:underline">
          بازگشت به فروشگاه
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-muted">...</div>}>
      <LoginInner />
    </Suspense>
  );
}

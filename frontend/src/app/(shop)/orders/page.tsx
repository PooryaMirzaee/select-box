"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";

export default function TrackOrderPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    const tracking = code.trim().toUpperCase();
    if (!tracking) return;
    router.push(`/orders/${tracking}`);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-3xl font-semibold">پیگیری سفارش</h1>
      <p className="mt-2 text-sm text-muted">کد رهگیری ۸ کاراکتری که پس از ثبت سفارش دریافت کردید را وارد کنید.</p>
      <form onSubmit={go} className="mt-8 flex gap-2">
        <input
          className="input-theme min-h-[48px] flex-1 font-mono uppercase"
          dir="ltr"
          placeholder="مثلاً A1B2C3D4"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <Button type="submit">پیگیری</Button>
      </form>
    </div>
  );
}

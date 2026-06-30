"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { formatToman } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function OrderContent() {
  const { tracking } = useParams<{ tracking: string }>();
  const search = useSearchParams();
  const success = search.get("success");
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch(`${API}/api/v1/checkout/orders/${tracking}`)
      .then((r) => r.json())
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [tracking]);

  if (!order) {
    return <p className="p-16 text-center text-muted">در حال بارگذاری...</p>;
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center">
      {success ? <p className="mb-4 text-[var(--accent)]">پرداخت با موفقیت انجام شد</p> : null}
      <div className="card-theme mx-auto max-w-md p-8">
        <h1 className="text-2xl font-semibold sm:text-3xl">سفارش ثبت شد</h1>
        <p className="mt-4 text-muted">
          کد رهگیری:{" "}
          <span className="font-mono text-[var(--accent)]">{String(order.tracking_code)}</span>
        </p>
        <p className="mt-2 text-muted">وضعیت: {String(order.status)}</p>
        <p className="mt-4 text-lg font-semibold">{formatToman(String(order.total))}</p>
        <Link href="/catalog" className="mt-8 inline-block">
          <Button>ادامه خرید</Button>
        </Link>
      </div>
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={<p className="p-16 text-center">...</p>}>
      <OrderContent />
    </Suspense>
  );
}

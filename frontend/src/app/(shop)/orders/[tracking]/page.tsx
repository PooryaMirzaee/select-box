"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { apiBase } from "@/lib/api-base";
import { Button } from "@/components/ui/Button";
import { orderStatusLabel } from "@/lib/admin-status";
import { formatToman } from "@/lib/utils";

const API = apiBase();

function OrderContent() {
  const { tracking } = useParams<{ tracking: string }>();
  const search = useSearchParams();
  const success = search.get("success");
  const pendingCard = search.get("pending_card");
  const failed = search.get("failed");
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
      {pendingCard ? (
        <p className="mb-4 text-amber-600 dark:text-amber-400">
          رسید شما ثبت شد و در انتظار تأیید فروشگاه است.
        </p>
      ) : null}
      {failed ? <p className="mb-4 text-red-500">پرداخت انجام نشد. دوباره تلاش کنید.</p> : null}
      <div className="card-theme mx-auto max-w-md p-8">
        <h1 className="text-2xl font-semibold sm:text-3xl">سفارش ثبت شد</h1>
        <p className="mt-4 text-muted">
          کد رهگیری:{" "}
          <span className="font-mono text-[var(--accent)]">{String(order.tracking_code)}</span>
        </p>
        <p className="mt-2 text-muted">
          وضعیت: {orderStatusLabel(String(order.status))}
        </p>
        <p className="mt-4 text-lg font-semibold">{formatToman(String(order.total))}</p>
        {order.status === "pending_payment" && order.card_transfer_url ? (
          <Link href={String(order.card_transfer_url)} className="mt-6 inline-block">
            <Button variant="outline">ادامه پرداخت کارت‌به‌کارت</Button>
          </Link>
        ) : null}
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

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/Button";
import { confirmPayment } from "@/lib/api";

function MockPayInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const orderId = Number(sp.get("order_id"));
  const [loading, setLoading] = useState(false);

  async function confirm() {
    if (!orderId) return;
    setLoading(true);
    try {
      const r = await confirmPayment(orderId);
      router.push(`/orders/${r.tracking_code}?success=1`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطا");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-xl font-semibold">پرداخت آزمایشی</h1>
      <p className="mt-3 text-sm text-muted">در حالت mock — بدون تراکنش واقعی</p>
      <Button className="mt-8 w-full" size="lg" disabled={loading || !orderId} onClick={confirm}>
        {loading ? "..." : "تأیید پرداخت"}
      </Button>
    </div>
  );
}

export default function MockPayPage() {
  return (
    <Suspense>
      <MockPayInner />
    </Suspense>
  );
}

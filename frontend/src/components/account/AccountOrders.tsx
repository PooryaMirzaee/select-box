"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { fetchMyOrders, type MyOrderSummary } from "@/lib/auth";
import { orderStatusLabel } from "@/lib/admin-status";
import { formatToman } from "@/lib/utils";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

export function AccountOrders() {
  const [orders, setOrders] = useState<MyOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await fetchMyOrders());
    } catch (e) {
      setOrders([]);
      setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-sm text-muted">در حال بارگذاری سفارش‌ها…</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (orders.length === 0) {
    return (
      <p className="text-sm text-muted">
        هنوز سفارشی با این حساب ثبت نشده — پس از ورود، سفارش‌های بعدی اینجا نمایش داده می‌شوند.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o.id} className="rounded-xl border border-theme p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-mono text-sm font-medium">{o.tracking_code}</p>
              <p className="mt-1 text-xs text-muted">{formatDate(o.created_at)}</p>
            </div>
            <div className="text-end">
              <p className="font-bold">{formatToman(o.total)}</p>
              <p className="mt-1 text-xs">{orderStatusLabel(o.status)}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">{o.item_count} قلم</p>
          <Link
            href={`/orders/${o.tracking_code}`}
            className="mt-2 inline-block text-xs text-[var(--accent)] hover:underline"
          >
            جزئیات و پیگیری ←
          </Link>
        </li>
      ))}
    </ul>
  );
}

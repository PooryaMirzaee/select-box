"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Eye, Package } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { adminFetch, type OrderAdminListItem } from "@/lib/api";
import {
  ORDER_STATUSES,
  orderStatusColor,
  orderStatusLabel,
} from "@/lib/admin-status";
import { cn, formatToman } from "@/lib/utils";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function AdminOrdersPage() {
  const [items, setItems] = useState<OrderAdminListItem[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = () => localStorage.getItem("selectbox_admin_token")!;

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const q = filter ? `?status=${encodeURIComponent(filter)}` : "";
    adminFetch<OrderAdminListItem[]>(`/api/v1/admin/orders${q}`, token())
      .then(setItems)
      .catch((e) => {
        setItems([]);
        setError(e instanceof Error ? e.message : "خطا در بارگذاری");
      })
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const paid = items.filter((o) => o.status === "paid" || o.status === "processing").length;
    const pending = items.filter((o) => o.status === "pending_payment").length;
    return { total: items.length, paid, pending };
  }, [items]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">سفارش‌ها</h1>
          <p className="mt-1 text-sm text-muted">مدیریت، پیگیری و تغییر وضعیت</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? "..." : "بروزرسانی"}
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: "نمایش فعلی", value: stats.total },
          { label: "در انتظار پرداخت", value: stats.pending },
          { label: "پرداخت‌شده / آماده‌سازی", value: stats.paid },
        ].map((s) => (
          <div key={s.label} className="card-theme p-4">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          className={cn("chip-theme", !filter && "is-active")}
          onClick={() => setFilter("")}
        >
          همه
        </button>
        {ORDER_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className={cn("chip-theme", filter === s && "is-active")}
            onClick={() => setFilter(s)}
          >
            {orderStatusLabel(s)}
          </button>
        ))}
      </div>

      {error ? <p className="mt-6 text-sm text-red-500">{error}</p> : null}

      {loading ? (
        <p className="mt-10 text-muted">در حال بارگذاری...</p>
      ) : items.length === 0 ? (
        <div className="card-theme mt-10 p-10 text-center">
          <Package size={40} className="mx-auto text-muted" />
          <p className="mt-4 text-muted">سفارشی یافت نشد</p>
        </div>
      ) : (
        <div className="card-theme mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-theme text-muted">
              <tr>
                <th className="p-4 text-right">کد رهگیری</th>
                <th className="p-4 text-right">مشتری</th>
                <th className="p-4 text-right">اقلام</th>
                <th className="p-4 text-right">وضعیت</th>
                <th className="p-4 text-right">مبلغ</th>
                <th className="p-4 text-right">تاریخ</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id} className="border-b border-theme/60">
                  <td className="p-4">
                    <span className="font-mono font-medium text-[var(--accent)]">{o.tracking_code}</span>
                  </td>
                  <td className="p-4">
                    <p>{o.customer_name ?? "—"}</p>
                    {o.customer_phone ? (
                      <p className="text-xs text-muted" dir="ltr">
                        {o.customer_phone}
                      </p>
                    ) : null}
                  </td>
                  <td className="p-4 text-muted">{o.item_count} قلم</td>
                  <td className="p-4">
                    <span className={cn("inline-block px-2 py-0.5 text-xs font-medium", orderStatusColor(o.status))}>
                      {orderStatusLabel(o.status)}
                    </span>
                  </td>
                  <td className="p-4 font-medium">{formatToman(o.total)}</td>
                  <td className="p-4 text-xs text-muted">{formatDate(o.created_at)}</td>
                  <td className="p-4">
                    <Link href={`/admin/orders/${o.id}`}>
                      <Button size="sm" variant="outline">
                        <Eye size={16} className="me-1" />
                        جزئیات
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

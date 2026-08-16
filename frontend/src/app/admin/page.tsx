"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { adminFetch, type OrderAdminListItem } from "@/lib/api";
import { orderStatusColor, orderStatusLabel } from "@/lib/admin-status";
import { cn, formatToman } from "@/lib/utils";

type Dash = {
  products_published: number;
  products_draft: number;
  designs: number;
  orders: number;
  revenue_paid: string;
  pending_payment: number;
  pending_receipts: number;
  to_ship: number;
  low_stock: number;
  recent_orders: OrderAdminListItem[];
};

export default function AdminDashboard() {
  const [data, setData] = useState<Dash | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("selectbox_admin_token");
    if (!token) return;
    adminFetch<Dash>("/api/v1/admin/dashboard", token).then(setData).catch(() => {});
  }, []);

  const queues = data
    ? [
        {
          label: "در انتظار پرداخت",
          value: data.pending_payment,
          href: "/admin/orders?status=pending_payment",
        },
        {
          label: "رسید کارت‌به‌کارت",
          value: data.pending_receipts,
          href: "/admin/orders?status=pending_payment",
        },
        {
          label: "آماده ارسال",
          value: data.to_ship,
          href: "/admin/orders?status=paid",
        },
        {
          label: "کم‌موجودی",
          value: data.low_stock,
          href: "/admin/products?stock=low",
        },
      ]
    : [];

  const cards = data
    ? [
        { label: "محصول منتشر", value: data.products_published },
        { label: "پیش‌نویس", value: data.products_draft },
        { label: "کل سفارش‌ها", value: data.orders },
        { label: "درآمد تحقق‌یافته", value: formatToman(data.revenue_paid) },
      ]
    : [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">داشبورد</h1>
          <p className="mt-1 text-sm text-muted">صف کار روزانه و خلاصه فروشگاه</p>
        </div>
        <Link
          href="/admin/help"
          className="rounded-full border border-theme px-4 py-2 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          آموزش مسئول سایت
        </Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {queues.map((c) => (
          <Link key={c.label} href={c.href} className="card-theme p-5 transition hover:border-[var(--accent)]">
            <p className="text-sm text-muted">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card-theme p-6">
            <p className="text-sm text-muted">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>

      {data?.recent_orders?.length ? (
        <div className="card-theme mt-8 overflow-x-auto">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="font-medium">آخرین سفارش‌ها</h2>
            <Link href="/admin/orders" className="text-sm text-[var(--accent)]">
              همه سفارش‌ها
            </Link>
          </div>
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-t border-theme text-muted">
              <tr>
                <th className="p-3 text-right">کد</th>
                <th className="p-3 text-right">مشتری</th>
                <th className="p-3 text-right">وضعیت</th>
                <th className="p-3 text-right">مبلغ</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_orders.map((o) => (
                <tr key={o.id} className="border-t border-theme/60">
                  <td className="p-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-mono text-[var(--accent)]">
                      {o.tracking_code}
                    </Link>
                  </td>
                  <td className="p-3">
                    {o.customer_name ?? "—"}
                    {o.has_pending_receipt ? (
                      <span className="ms-2 text-xs text-amber-600">رسید</span>
                    ) : null}
                  </td>
                  <td className="p-3">
                    <span className={cn("px-2 py-0.5 text-xs", orderStatusColor(o.status))}>
                      {orderStatusLabel(o.status)}
                    </span>
                  </td>
                  <td className="p-3">{formatToman(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

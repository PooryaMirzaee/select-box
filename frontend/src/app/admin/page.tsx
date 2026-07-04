"use client";

import { useEffect, useState } from "react";

import { adminFetch } from "@/lib/api";
import { formatToman } from "@/lib/utils";

type Dash = {
  products_published: number;
  products_draft: number;
  designs: number;
  orders: number;
  revenue_paid: string;
};

export default function AdminDashboard() {
  const [data, setData] = useState<Dash | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("selectbox_admin_token");
    if (!token) return;
    adminFetch<Dash>("/api/v1/admin/dashboard", token).then(setData).catch(() => {});
  }, []);

  const cards = data
    ? [
        { label: "محصول منتشر", value: data.products_published },
        { label: "پیش‌نویس", value: data.products_draft },
        { label: "طرح‌ها", value: data.designs },
        { label: "سفارش‌ها", value: data.orders },
        { label: "درآمد پرداخت‌شده", value: `${formatToman(data.revenue_paid)}` },
      ]
    : [];

  return (
    <div>
      <h1 className="text-3xl font-semibold">داشبورد</h1>
      <p className="mt-1 text-sm text-muted">خلاصه وضعیت فروشگاه</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card-theme p-6">
            <p className="text-sm text-muted">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

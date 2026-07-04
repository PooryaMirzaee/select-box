"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { adminFetch } from "@/lib/api";

type Coupon = {
  id: number;
  code: string;
  discount_type: string;
  discount_value: string;
  min_cart_total: string | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
};

const empty = {
  code: "",
  discount_type: "percent",
  discount_value: "10",
  min_cart_total: "",
  max_uses: "",
  is_active: true,
};

export default function AdminCouponsPage() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);

  const token = () => localStorage.getItem("selectbox_admin_token")!;

  const load = () =>
    adminFetch<Coupon[]>("/api/v1/admin/coupons", token()).then(setItems).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      code: form.code,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_cart_total: form.min_cart_total ? Number(form.min_cart_total) : null,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      is_active: form.is_active,
    };
    if (editId) {
      await adminFetch(`/api/v1/admin/coupons/${editId}`, token(), {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    } else {
      await adminFetch("/api/v1/admin/coupons", token(), {
        method: "POST",
        body: JSON.stringify(body),
      });
    }
    setForm(empty);
    setEditId(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm("حذف کوپن؟")) return;
    await adminFetch(`/api/v1/admin/coupons/${id}`, token(), { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">کوپن‌ها</h1>
      <form onSubmit={save} className="mt-6 grid max-w-md gap-3 rounded-2xl border border-theme p-5">
        <input
          placeholder="کد"
          className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 font-mono uppercase"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          required
        />
        <select
          className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
          value={form.discount_type}
          onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
        >
          <option value="percent">درصد</option>
          <option value="fixed">مبلغ ثابت (تومان)</option>
        </select>
        <input
          type="number"
          placeholder="مقدار تخفیف"
          className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
          value={form.discount_value}
          onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
        />
        <input
          type="number"
          placeholder="حداقل سبد (تومان)"
          className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
          value={form.min_cart_total}
          onChange={(e) => setForm({ ...form, min_cart_total: e.target.value })}
        />
        <Button type="submit">{editId ? "ذخیره" : "افزودن"}</Button>
      </form>
      <ul className="mt-8 space-y-2 text-sm">
        {items.map((c) => (
          <li key={c.id} className="flex justify-between rounded-xl border border-theme px-4 py-3">
            <span>
              <strong>{c.code}</strong> — {c.discount_type === "percent" ? `${c.discount_value}%` : `${c.discount_value} ت`}
              {c.min_cart_total ? ` (حداقل ${c.min_cart_total})` : ""}
            </span>
            <Button size="sm" variant="outline" onClick={() => remove(c.id)}>
              حذف
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

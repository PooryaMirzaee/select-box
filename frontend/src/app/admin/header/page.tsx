"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { adminFetch } from "@/lib/api";
import type { HeaderNavLink } from "@/lib/header-nav";

const empty = {
  label_fa: "",
  href: "",
  sort_order: 0,
  is_active: true,
  open_in_new_tab: false,
};

export default function AdminHeaderPage() {
  const [items, setItems] = useState<HeaderNavLink[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const token = () => localStorage.getItem("coralay_admin_token")!;

  const load = () =>
    adminFetch<HeaderNavLink[]>("/api/v1/admin/header-nav", token())
      .then(setItems)
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        label_fa: form.label_fa.trim(),
        href: form.href.trim(),
        sort_order: form.sort_order ? Number(form.sort_order) : 0,
        is_active: form.is_active,
        open_in_new_tab: form.open_in_new_tab,
      };
      if (editId) {
        await adminFetch(`/api/v1/admin/header-nav/${editId}`, token(), {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await adminFetch("/api/v1/admin/header-nav", token(), {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      setForm(empty);
      setEditId(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("حذف این لینک از هدر؟")) return;
    await adminFetch(`/api/v1/admin/header-nav/${id}`, token(), { method: "DELETE" });
    if (editId === id) {
      setForm(empty);
      setEditId(null);
    }
    load();
  }

  async function move(id: number, direction: "up" | "down") {
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;
    const ids = items.map((item) => item.id);
    [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
    const next = await adminFetch<HeaderNavLink[]>("/api/v1/admin/header-nav/reorder", token(), {
      method: "POST",
      body: JSON.stringify(ids),
    });
    setItems(next);
  }

  function startEdit(item: HeaderNavLink) {
    setEditId(item.id);
    setForm({
      label_fa: item.label_fa,
      href: item.href,
      sort_order: item.sort_order,
      is_active: item.is_active,
      open_in_new_tab: item.open_in_new_tab,
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">مدیریت هدر</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        لینک‌های منوی اصلی فروشگاه (دسکتاپ و منوی موبایل هدر) را از اینجا مدیریت کنید. منوی
        دسته‌بندی‌ها همچنان از بخش دسته‌ها کنترل می‌شود.
      </p>

      <form onSubmit={save} className="mt-6 grid max-w-xl gap-3 rounded-2xl border border-theme p-5">
        <h2 className="text-sm font-medium">{editId ? "ویرایش لینک" : "افزودن لینک"}</h2>
        <input
          placeholder="عنوان (مثلاً مجله)"
          className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
          value={form.label_fa}
          onChange={(e) => setForm({ ...form, label_fa: e.target.value })}
          required
        />
        <input
          placeholder="آدرس (مثلاً /blog یا https://...)"
          className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 font-mono text-sm"
          dir="ltr"
          value={form.href}
          onChange={(e) => setForm({ ...form, href: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="ترتیب نمایش (اختیاری)"
          className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
          value={form.sort_order || ""}
          onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          فعال
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.open_in_new_tab}
            onChange={(e) => setForm({ ...form, open_in_new_tab: e.target.checked })}
          />
          باز شدن در تب جدید
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            {editId ? "ذخیره" : "افزودن"}
          </Button>
          {editId ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditId(null);
                setForm(empty);
              }}
            >
              انصراف
            </Button>
          ) : null}
        </div>
      </form>

      <ul className="mt-8 space-y-2 text-sm">
        {items.length === 0 ? (
          <li className="rounded-xl border border-dashed border-theme px-4 py-6 text-center text-muted">
            هنوز لینکی ثبت نشده است.
          </li>
        ) : null}
        {items.map((item, index) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-theme px-4 py-3"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <strong>{item.label_fa}</strong>
                {!item.is_active ? (
                  <span className="rounded-full bg-[var(--input-bg)] px-2 py-0.5 text-xs text-muted">
                    غیرفعال
                  </span>
                ) : null}
              </div>
              <p className="mt-1 font-mono text-xs text-muted" dir="ltr">
                {item.href}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={index === 0}
                onClick={() => move(item.id, "up")}
              >
                بالا
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={index === items.length - 1}
                onClick={() => move(item.id, "down")}
              >
                پایین
              </Button>
              <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                ویرایش
              </Button>
              <Button size="sm" variant="outline" onClick={() => remove(item.id)}>
                حذف
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

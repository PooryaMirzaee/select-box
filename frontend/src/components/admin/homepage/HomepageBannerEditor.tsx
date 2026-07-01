"use client";

import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { adminFetch } from "@/lib/api";
import { apiUrl } from "@/lib/api-base";
import {
  BANNER_PLACEMENTS,
  BANNER_VARIANTS,
  type HomeBannerAdmin,
} from "@/lib/home-banners";
import { mediaUrl } from "@/lib/media";

const emptyForm = {
  title_fa: "",
  subtitle_fa: "",
  eyebrow_fa: "",
  cta_label: "",
  cta_href: "",
  placement: "hero" as "hero" | "promo",
  variant: "image" as "image" | "text",
  text_align: "start" as "start" | "center",
  overlay_opacity: 35,
  accent_style: "default" as "default" | "primary",
  sort_order: 0,
  is_active: true,
  open_in_new_tab: false,
  starts_at: "",
  ends_at: "",
};

function toLocalDatetime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoOrNull(local: string) {
  if (!local.trim()) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

type Props = {
  items: HomeBannerAdmin[];
  defaultPlacement: "hero" | "promo";
  token: string;
  onChange: () => void;
};

export function HomepageBannerEditor({ items, defaultPlacement, token, onChange }: Props) {
  const [form, setForm] = useState({ ...emptyForm, placement: defaultPlacement });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<HomeBannerAdmin | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function uploadImage(bannerId: number, file: File, mobile = false) {
    const fd = new FormData();
    fd.append("file", file);
    const path = mobile
      ? `/api/v1/admin/home-banners/${bannerId}/image-mobile`
      : `/api/v1/admin/home-banners/${bannerId}/image`;
    const res = await fetch(apiUrl(path), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!res.ok) throw new Error(await res.text());
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        title_fa: form.title_fa.trim() || null,
        subtitle_fa: form.subtitle_fa.trim() || null,
        eyebrow_fa: form.eyebrow_fa.trim() || null,
        cta_label: form.cta_label.trim() || null,
        cta_href: form.cta_href.trim() || null,
        placement: form.placement,
        variant: form.variant,
        text_align: form.text_align,
        overlay_opacity: Number(form.overlay_opacity) || 0,
        accent_style: form.accent_style,
        sort_order: form.sort_order ? Number(form.sort_order) : 0,
        is_active: form.is_active,
        open_in_new_tab: form.open_in_new_tab,
        starts_at: toIsoOrNull(form.starts_at),
        ends_at: toIsoOrNull(form.ends_at),
      };

      let bannerId = editId;
      if (editId) {
        await adminFetch(`/api/v1/admin/home-banners/${editId}`, token, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        const created = await adminFetch<HomeBannerAdmin>("/api/v1/admin/home-banners", token, {
          method: "POST",
          body: JSON.stringify(body),
        });
        bannerId = created.id;
      }

      if (bannerId && (desktopFile || mobileFile)) {
        if (desktopFile) await uploadImage(bannerId, desktopFile, false);
        if (mobileFile) await uploadImage(bannerId, mobileFile, true);
        setDesktopFile(null);
        setMobileFile(null);
      }

      setForm({ ...emptyForm, placement: defaultPlacement });
      setEditId(null);
      setPreview(null);
      setExpanded(false);
      onChange();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("حذف این بنر؟")) return;
    await adminFetch(`/api/v1/admin/home-banners/${id}`, token, { method: "DELETE" });
    if (editId === id) {
      setForm({ ...emptyForm, placement: defaultPlacement });
      setEditId(null);
      setPreview(null);
    }
    onChange();
  }

  async function move(id: number, direction: "up" | "down") {
    const index = items.findIndex((b) => b.id === id);
    if (index < 0) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;
    const ids = items.map((b) => b.id);
    [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
    await adminFetch("/api/v1/admin/home-banners/reorder", token, {
      method: "POST",
      body: JSON.stringify(ids),
    });
    onChange();
  }

  function startEdit(item: HomeBannerAdmin) {
    setEditId(item.id);
    setPreview(item);
    setExpanded(true);
    setForm({
      title_fa: item.title_fa ?? "",
      subtitle_fa: item.subtitle_fa ?? "",
      eyebrow_fa: item.eyebrow_fa ?? "",
      cta_label: item.cta_label ?? "",
      cta_href: item.cta_href ?? "",
      placement: item.placement,
      variant: item.variant,
      text_align: item.text_align,
      overlay_opacity: item.overlay_opacity,
      accent_style: item.accent_style,
      sort_order: item.sort_order,
      is_active: item.is_active,
      open_in_new_tab: item.open_in_new_tab,
      starts_at: toLocalDatetime(item.starts_at),
      ends_at: toLocalDatetime(item.ends_at),
    });
  }

  async function removeImage(id: number, mobile = false) {
    const path = mobile
      ? `/api/v1/admin/home-banners/${id}/image-mobile`
      : `/api/v1/admin/home-banners/${id}/image`;
    await adminFetch(path, token, { method: "DELETE" });
    onChange();
  }

  const previewImage = preview?.image_url ? mediaUrl(preview.image_url) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {items.length} بنر · {items.filter((b) => b.is_active).length} فعال
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setExpanded(true);
            setEditId(null);
            setForm({ ...emptyForm, placement: defaultPlacement });
            setPreview(null);
          }}
        >
          + بنر جدید
        </Button>
      </div>

      <ul className="space-y-2">
        {items.length === 0 ? (
          <li className="rounded-xl border border-dashed border-theme px-4 py-8 text-center text-sm text-muted">
            هنوز بنری ثبت نشده.
          </li>
        ) : null}
        {items.map((item, index) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-theme bg-[var(--bg-elevated)]/40 px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              {item.image_url ? (
                <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-theme">
                  <Image src={mediaUrl(item.image_url)} alt="" fill className="object-cover" sizes="80px" />
                </div>
              ) : (
                <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-theme text-[10px] text-muted">
                  متنی
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium">{item.title_fa || `بنر #${item.id}`}</span>
                  {!item.is_active ? (
                    <span className="rounded-full bg-[var(--input-bg)] px-2 py-0.5 text-[10px] text-muted">غیرفعال</span>
                  ) : null}
                </div>
                {item.cta_href ? (
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted" dir="ltr">
                    {item.cta_href}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" disabled={index === 0} onClick={() => move(item.id, "up")}>
                ↑
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={index === items.length - 1}
                onClick={() => move(item.id, "down")}
              >
                ↓
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

      {expanded ? (
        <form onSubmit={save} className="grid gap-3 rounded-2xl border border-theme bg-[var(--sidebar-bg)] p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{editId ? "ویرایش بنر" : "بنر جدید"}</h3>
            <button
              type="button"
              className="text-xs text-muted hover:text-[var(--fg)]"
              onClick={() => {
                setExpanded(false);
                setEditId(null);
                setForm({ ...emptyForm, placement: defaultPlacement });
              }}
            >
              بستن
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              محل
              <select
                className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
                value={form.placement}
                onChange={(e) => setForm({ ...form, placement: e.target.value as "hero" | "promo" })}
              >
                {BANNER_PLACEMENTS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              نوع
              <select
                className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
                value={form.variant}
                onChange={(e) => setForm({ ...form, variant: e.target.value as "image" | "text" })}
              >
                {BANNER_VARIANTS.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <input
            placeholder="برچسب کوچک"
            className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm"
            value={form.eyebrow_fa}
            onChange={(e) => setForm({ ...form, eyebrow_fa: e.target.value })}
          />
          <input
            placeholder="عنوان"
            className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm"
            value={form.title_fa}
            onChange={(e) => setForm({ ...form, title_fa: e.target.value })}
          />
          <textarea
            placeholder="زیرعنوان"
            rows={2}
            className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm"
            value={form.subtitle_fa}
            onChange={(e) => setForm({ ...form, subtitle_fa: e.target.value })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              placeholder="متن دکمه"
              className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm"
              value={form.cta_label}
              onChange={(e) => setForm({ ...form, cta_label: e.target.value })}
            />
            <input
              placeholder="لینک"
              className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 font-mono text-sm"
              dir="ltr"
              value={form.cta_href}
              onChange={(e) => setForm({ ...form, cta_href: e.target.value })}
            />
          </div>

          {form.variant === "image" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                تصویر دسکتاپ
                <input type="file" accept="image/*" onChange={(e) => setDesktopFile(e.target.files?.[0] ?? null)} />
              </label>
              <label className="grid gap-1 text-sm">
                تصویر موبایل
                <input type="file" accept="image/*" onChange={(e) => setMobileFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          ) : null}

          {editId && previewImage ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative h-16 w-28 overflow-hidden rounded-lg border border-theme">
                <Image src={previewImage} alt="" fill className="object-cover" sizes="112px" />
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => removeImage(editId, false)}>
                حذف تصویر
              </Button>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm">
              تراز
              <select
                className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
                value={form.text_align}
                onChange={(e) => setForm({ ...form, text_align: e.target.value as "start" | "center" })}
              >
                <option value="start">راست</option>
                <option value="center">وسط</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              تیرگی ({form.overlay_opacity}%)
              <input
                type="range"
                min={0}
                max={80}
                value={form.overlay_opacity}
                onChange={(e) => setForm({ ...form, overlay_opacity: Number(e.target.value) })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              دکمه
              <select
                className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
                value={form.accent_style}
                onChange={(e) => setForm({ ...form, accent_style: e.target.value as "default" | "primary" })}
              >
                <option value="default">حاشیه‌دار</option>
                <option value="primary">پررنگ</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              شروع نمایش
              <input
                type="datetime-local"
                className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              پایان نمایش
              <input
                type="datetime-local"
                className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            فعال
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.open_in_new_tab}
              onChange={(e) => setForm({ ...form, open_in_new_tab: e.target.checked })}
            />
            تب جدید
          </label>

          <Button type="submit" disabled={saving}>
            {saving ? "ذخیره…" : editId ? "ذخیره بنر" : "افزودن بنر"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

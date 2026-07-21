"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  type SizeGuideData,
} from "@/lib/size-guide";
import { apiUrl } from "@/lib/api-base";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

type Props = {
  productId: number;
  value: SizeGuideData;
  onChange: (next: SizeGuideData) => void;
};

export function ProductSizeGuideEditor({ productId, value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const token = () => localStorage.getItem("selectbox_admin_token")!;

  function patch(partial: Partial<SizeGuideData>) {
    onChange({ ...value, ...partial });
  }

  function setColumn(index: number, text: string) {
    const columns = [...value.columns];
    columns[index] = text;
    patch({ columns });
  }

  function addColumn() {
    patch({ columns: [...value.columns, "ستون جدید"] });
  }

  function removeColumn(index: number) {
    if (value.columns.length <= 1) return;
    patch({
      columns: value.columns.filter((_, i) => i !== index),
      rows: value.rows.map((row) => row.filter((_, i) => i !== index)),
    });
  }

  function setCell(rowIndex: number, colIndex: number, text: string) {
    const rows = value.rows.map((row, ri) => {
      if (ri !== rowIndex) return row;
      const next = [...row];
      while (next.length < value.columns.length) next.push("");
      next[colIndex] = text;
      return next;
    });
    patch({ rows });
  }

  function addRow() {
    patch({
      rows: [...value.rows, value.columns.map(() => "")],
    });
  }

  function removeRow(index: number) {
    patch({ rows: value.rows.filter((_, i) => i !== index) });
  }

  function setNote(index: number, text: string) {
    const notes = [...value.notes];
    notes[index] = text;
    patch({ notes });
  }

  function addNote() {
    patch({ notes: [...value.notes, ""] });
  }

  function removeNote(index: number) {
    patch({ notes: value.notes.filter((_, i) => i !== index) });
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(apiUrl(`/api/v1/admin/products/${productId}/size-guide-image`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { image_key: string; url: string };
      patch({ image_key: data.image_key, image_url: data.url });
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطا در آپلود");
    } finally {
      setUploading(false);
    }
  }

  function clearImage() {
    patch({ image_key: null, image_url: null });
  }

  const previewUrl = value.image_url ?? (value.image_key ? mediaUrl(value.image_key) : null);

  return (
    <section className="mt-10 rounded-2xl border border-theme p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">مشخصات فنی</h2>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
            className="h-4 w-4 rounded border-theme"
          />
          <span className="text-muted">نمایش در صفحه محصول</span>
        </label>
      </div>

      <p className="mb-4 text-xs text-muted">
        جدول اندازه‌گیری، تصویر راهنما و یادداشت‌ها را برای این محصول تنظیم کنید. با ذخیره
        محصول اعمال می‌شود.
      </p>

      <div className="space-y-4">
        <label className="block text-sm">
          <span className="text-muted">عنوان</span>
          <input
            className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
            value={value.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </label>

        <label className="block text-sm">
          <span className="text-muted">متن intro (اختیاری)</span>
          <textarea
            rows={2}
            className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
            value={value.intro}
            onChange={(e) => patch({ intro: e.target.value })}
            placeholder="مثلاً: اندازه‌ها بر حسب سانتی‌متر و با لباس اندازه‌گیری شده‌اند."
          />
        </label>

        <div>
          <p className="mb-2 text-sm text-muted">تصویر راهنما (اختیاری)</p>
          {previewUrl ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="مشخصات فنی"
                className="max-h-64 rounded-xl border border-theme object-contain"
              />
              <div className="flex gap-2">
                <label className="cursor-pointer">
                  <span className="inline-block rounded-xl border border-theme px-3 py-1.5 text-xs">
                    {uploading ? "..." : "تعویض تصویر"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadImage(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={clearImage}
                  className="rounded-xl border border-theme px-3 py-1.5 text-xs text-red-500"
                >
                  حذف تصویر
                </button>
              </div>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-theme px-4 py-8 text-sm text-muted transition hover:border-[var(--accent)]/40">
              {uploading ? "در حال آپلود..." : "کلیک برای آپلود تصویر راهنما"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadImage(f);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">جدول اندازه‌ها</p>
            <Button type="button" variant="outline" onClick={addColumn}>
              + ستون
            </Button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-theme">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-theme bg-surface/50">
                  {value.columns.map((col, ci) => (
                    <th key={ci} className="p-2 text-right font-normal">
                      <div className="flex items-center gap-1">
                        <input
                          className="w-full rounded-lg border border-theme bg-[var(--input-bg)] px-2 py-1 text-xs"
                          value={col}
                          onChange={(e) => setColumn(ci, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => removeColumn(ci)}
                          className={cn(
                            "shrink-0 text-xs text-red-500",
                            value.columns.length <= 1 && "invisible",
                          )}
                          aria-label="حذف ستون"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="w-10 p-2" />
                </tr>
              </thead>
              <tbody>
                {value.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-theme last:border-0">
                    {value.columns.map((_, ci) => (
                      <td key={ci} className="p-2">
                        <input
                          className="w-full rounded-lg border border-theme bg-[var(--input-bg)] px-2 py-1 text-xs"
                          value={row[ci] ?? ""}
                          onChange={(e) => setCell(ri, ci, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => removeRow(ri)}
                        className="text-xs text-red-500"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" variant="outline" className="mt-2" onClick={addRow}>
            + ردیف
          </Button>
        </div>

        <div>
          <p className="mb-2 text-sm text-muted">یادداشت‌ها (اختیاری)</p>
          <div className="space-y-2">
            {value.notes.map((note, ni) => (
              <div key={ni} className="flex gap-2">
                <input
                  className="flex-1 rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm"
                  value={note}
                  onChange={(e) => setNote(ni, e.target.value)}
                  placeholder="مثلاً: ±۲ سانتی‌متر خطای اندازه‌گیری طبیعی است"
                />
                <button
                  type="button"
                  onClick={() => removeNote(ni)}
                  className="shrink-0 text-sm text-red-500"
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" className="mt-2" onClick={addNote}>
            + یادداشت
          </Button>
        </div>
      </div>
    </section>
  );
}

"use client";

import { Loader2, Trash2, Upload } from "@/components/icons";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  adminCreateDesignArt,
  adminDeleteDesignArt,
  adminFetchDesignArt,
  adminUpdateDesignArt,
  type DesignArtClip,
} from "@/lib/customizer";

type Props = { token: string };

export function AdminArtLibrary({ token }: Props) {
  const [clips, setClips] = useState<DesignArtClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("محبوب");
  const [title, setTitle] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await adminFetchDesignArt(token);
      setClips(rows);
    } catch {
      setClips([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <section className="mt-8 rounded-xl border border-theme p-6">
      <h2 className="font-medium">کتابخانه آرت Design Lab</h2>
      <p className="mt-1 text-sm text-muted">
        تصاویر/کلipartهای آماده که کاربران در پنل «آرت» می‌بینند
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          placeholder="دسته — مثلاً ورزشی"
          className="rounded border border-theme px-3 py-2 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <input
          placeholder="عنوان آرت"
          className="rounded border border-theme px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="number"
          placeholder="ترتیب"
          className="rounded border border-theme px-3 py-2 text-sm"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
        />
        <label className="flex cursor-pointer items-center gap-2 rounded border border-dashed border-theme px-3 py-2 text-sm">
          <Upload className="h-4 w-4 shrink-0" />
          <span className="truncate">{file?.name ?? "انتخاب PNG / JPG / WebP / SVG"}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {msg ? <p className="mt-2 text-sm text-muted">{msg}</p> : null}

      <Button
        className="mt-3"
        size="sm"
        disabled={!token || !title.trim() || !file || uploading}
        onClick={async () => {
          if (!file) return;
          setUploading(true);
          setMsg(null);
          try {
            const row = await adminCreateDesignArt(token, file, {
              category_fa: category.trim() || "عمومی",
              title: title.trim(),
              sort_order: sortOrder,
            });
            setClips((list) => [row, ...list]);
            setTitle("");
            setFile(null);
            setMsg("آرت اضافه شد ✓");
          } catch {
            setMsg("خطا در آپلود — فرمت یا حجم مجاز نیست");
          } finally {
            setUploading(false);
          }
        }}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "افزودن آرت"}
      </Button>

      {loading ? (
        <p className="mt-6 text-sm text-muted">در حال بارگذاری…</p>
      ) : clips.length === 0 ? (
        <p className="mt-6 text-sm text-muted">هنوز آرت ثبت نشده</p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clips.map((clip) => (
            <li key={clip.id} className="rounded-lg border border-theme p-3">
              <div className="flex gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-theme bg-[var(--input-bg)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={clip.url} alt={clip.title} className="max-h-full max-w-full object-contain" />
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium truncate">{clip.title}</p>
                  <p className="text-muted">{clip.category_fa}</p>
                  <label className="mt-2 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={clip.is_active}
                      onChange={async (e) => {
                        try {
                          const updated = await adminUpdateDesignArt(token, clip.id, {
                            is_active: e.target.checked,
                          });
                          setClips((list) => list.map((x) => (x.id === clip.id ? updated : x)));
                        } catch {
                          setMsg("خطا در به‌روزرسانی");
                        }
                      }}
                    />
                    فعال
                  </label>
                </div>
                <button
                  type="button"
                  className="text-muted hover:text-red-400"
                  title="حذف"
                  onClick={async () => {
                    if (!confirm(`حذف «${clip.title}»؟`)) return;
                    try {
                      await adminDeleteDesignArt(token, clip.id);
                      setClips((list) => list.filter((x) => x.id !== clip.id));
                    } catch {
                      setMsg("خطا در حذف");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, ImagePlus, Trash2 } from "@/components/icons";

import { Button } from "@/components/ui/Button";
import { adminFetch } from "@/lib/api";
import type { BlogCategoryAdmin, BlogPostAdmin, BlogTag } from "@/lib/blog";
import { slugifyFa } from "@/lib/blog";
import { STORAGE_KEYS } from "@/lib/storage-keys";

type Props = {
  post?: BlogPostAdmin;
  onSave: (data: Partial<BlogPostAdmin>) => Promise<void>;
  onUploadCover?: (file: File) => Promise<void>;
  onRemoveCover?: () => Promise<void>;
};

const empty: Partial<BlogPostAdmin> = {
  title: "",
  slug: "",
  excerpt: "",
  content_html: "",
  category_id: null,
  tag_ids: [],
  status: "draft",
  is_featured: false,
  meta_title: "",
  meta_description: "",
};

export function BlogPostEditor({ post, onSave, onUploadCover, onRemoveCover }: Props) {
  const [form, setForm] = useState<Partial<BlogPostAdmin>>(post ?? empty);
  const [categories, setCategories] = useState<BlogCategoryAdmin[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"content" | "seo">("content");
  const [msg, setMsg] = useState("");

  const token = () => localStorage.getItem(STORAGE_KEYS.adminToken)!;

  useEffect(() => {
    if (post) setForm(post);
  }, [post]);

  useEffect(() => {
    Promise.all([
      adminFetch<BlogCategoryAdmin[]>("/api/v1/admin/blog/categories", token()),
      adminFetch<BlogTag[]>("/api/v1/admin/blog/tags", token()),
    ])
      .then(([cats, tgs]) => {
        setCategories(cats);
        setTags(tgs);
      })
      .catch(() => {});
  }, []);

  function setField<K extends keyof BlogPostAdmin>(key: K, value: BlogPostAdmin[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleTag(id: number) {
    const ids = form.tag_ids ?? [];
    setField(
      "tag_ids",
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      await onSave(form);
      setMsg("ذخیره شد");
    } catch {
      setMsg("خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="mt-6 max-w-3xl space-y-6">
      <div className="flex gap-2 border-b border-theme pb-2">
        {(["content", "seo"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`rounded-lg px-4 py-2 text-sm transition ${
              tab === t ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]" : "text-muted"
            }`}
            onClick={() => setTab(t)}
          >
            {t === "content" ? "محتوا" : "SEO"}
          </button>
        ))}
      </div>

      {tab === "content" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm text-muted">عنوان</span>
              <input
                className="input-theme mt-1"
                value={form.title ?? ""}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((f) => ({
                    ...f,
                    title,
                    slug: f.slug || slugifyFa(title),
                  }));
                }}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm text-muted">اسلاگ (URL)</span>
              <input
                className="input-theme mt-1 font-mono text-sm"
                dir="ltr"
                value={form.slug ?? ""}
                onChange={(e) => setField("slug", e.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm text-muted">دسته</span>
              <select
                className="input-theme mt-1"
                value={form.category_id ?? ""}
                onChange={(e) =>
                  setField("category_id", e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">بدون دسته</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_fa}
                  </option>
                ))}
              </select>
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm text-muted">خلاصه (excerpt)</span>
              <textarea
                className="input-theme mt-1 min-h-[80px] resize-y"
                value={form.excerpt ?? ""}
                onChange={(e) => setField("excerpt", e.target.value)}
                rows={3}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm text-muted">محتوا (HTML)</span>
              <textarea
                className="input-theme mt-1 min-h-[280px] resize-y font-mono text-sm"
                dir="ltr"
                value={form.content_html ?? ""}
                onChange={(e) => setField("content_html", e.target.value)}
                placeholder="<h2>عنوان</h2><p>متن...</p>"
              />
            </label>
          </div>

          {tags.length > 0 ? (
            <div>
              <span className="text-sm text-muted">برچسب‌ها</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`chip-theme text-xs ${(form.tag_ids ?? []).includes(t.id) ? "is-active" : ""}`}
                    onClick={() => toggleTag(t.id)}
                  >
                    {t.name_fa}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {post && onUploadCover ? (
            <div className="card-theme p-4">
              <span className="text-sm font-medium">تصویر کاور</span>
              {form.cover_image_url ? (
                <div className="mt-3 flex items-start gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.cover_image_url}
                    alt=""
                    className="h-32 w-48 rounded-xl object-cover"
                  />
                  {onRemoveCover ? (
                    <button
                      type="button"
                      className="flex items-center gap-1 text-sm text-red-500"
                      onClick={() => void onRemoveCover()}
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </button>
                  ) : null}
                </div>
              ) : (
                <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-theme px-4 py-6 text-sm text-muted transition hover:border-[var(--accent)]">
                  <ImagePlus className="h-5 w-5" />
                  آپلود تصویر کاور
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onUploadCover(f);
                    }}
                  />
                </label>
              )}
            </div>
          ) : null}
        </>
      ) : (
        <div className="grid gap-4">
          <label className="block">
            <span className="text-sm text-muted">عنوان SEO</span>
            <input
              className="input-theme mt-1"
              value={form.meta_title ?? ""}
              onChange={(e) => setField("meta_title", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted">توضیحات SEO</span>
            <textarea
              className="input-theme mt-1 min-h-[80px]"
              value={form.meta_description ?? ""}
              onChange={(e) => setField("meta_description", e.target.value)}
            />
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-theme p-4">
        <label className="block">
          <span className="text-sm text-muted">وضعیت</span>
          <select
            className="input-theme mt-1 w-auto min-w-[140px]"
            value={form.status ?? "draft"}
            onChange={(e) => setField("status", e.target.value)}
          >
            <option value="draft">پیش‌نویس</option>
            <option value="published">منتشر شده</option>
            <option value="scheduled">زمان‌بندی</option>
          </select>
        </label>

        <label className="flex items-center gap-2 pt-5">
          <input
            type="checkbox"
            checked={form.is_featured ?? false}
            onChange={(e) => setField("is_featured", e.target.checked)}
          />
          <span className="text-sm">مقاله ویژه</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "در حال ذخیره..." : "ذخیره"}
        </Button>
        {msg ? <span className="text-sm text-muted">{msg}</span> : null}
        {post?.status === "published" && post.slug ? (
          <Link
            href={`/blog/${post.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-sm text-[var(--accent)]"
          >
            <Eye className="h-4 w-4" />
            پیش‌نمایش
          </Link>
        ) : null}
      </div>
    </form>
  );
}

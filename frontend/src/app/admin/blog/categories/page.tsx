"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2 } from "@/components/icons";

import { Button } from "@/components/ui/Button";
import { adminFetch } from "@/lib/api";
import type { BlogCategoryAdmin, BlogTag } from "@/lib/blog";
import { slugifyFa } from "@/lib/blog";
import { STORAGE_KEYS } from "@/lib/storage-keys";

export default function AdminBlogCategoriesPage() {
  const [categories, setCategories] = useState<BlogCategoryAdmin[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [catForm, setCatForm] = useState({ slug: "", name_fa: "", description: "" });
  const [tagForm, setTagForm] = useState({ slug: "", name_fa: "" });
  const [editCatId, setEditCatId] = useState<number | null>(null);

  const token = () => localStorage.getItem(STORAGE_KEYS.adminToken)!;

  const load = () => {
    adminFetch<BlogCategoryAdmin[]>("/api/v1/admin/blog/categories", token()).then(setCategories);
    adminFetch<BlogTag[]>("/api/v1/admin/blog/tags", token()).then(setTags);
  };

  useEffect(() => {
    load();
  }, []);

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      slug: catForm.slug || slugifyFa(catForm.name_fa),
      name_fa: catForm.name_fa,
      description: catForm.description || null,
      sort_order: 0,
    };
    if (editCatId) {
      await adminFetch(`/api/v1/admin/blog/categories/${editCatId}`, token(), {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    } else {
      await adminFetch("/api/v1/admin/blog/categories", token(), {
        method: "POST",
        body: JSON.stringify(body),
      });
    }
    setCatForm({ slug: "", name_fa: "", description: "" });
    setEditCatId(null);
    load();
  }

  async function saveTag(e: React.FormEvent) {
    e.preventDefault();
    await adminFetch("/api/v1/admin/blog/tags", token(), {
      method: "POST",
      body: JSON.stringify({
        slug: tagForm.slug || slugifyFa(tagForm.name_fa),
        name_fa: tagForm.name_fa,
      }),
    });
    setTagForm({ slug: "", name_fa: "" });
    load();
  }

  async function removeCategory(id: number) {
    if (!confirm("حذف دسته؟")) return;
    await adminFetch(`/api/v1/admin/blog/categories/${id}`, token(), { method: "DELETE" });
    load();
  }

  async function removeTag(id: number) {
    if (!confirm("حذف برچسب؟")) return;
    await adminFetch(`/api/v1/admin/blog/tags/${id}`, token(), { method: "DELETE" });
    load();
  }

  return (
    <div>
      <Link href="/admin/blog" className="text-sm text-muted transition hover:text-[var(--fg)]">
        ← بازگشت به وبلاگ
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">دسته‌ها و برچسب‌ها</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="font-medium">دسته‌بندی‌ها</h2>
          <form onSubmit={saveCategory} className="mt-4 space-y-3 rounded-2xl border border-theme p-4">
            <input
              placeholder="نام فارسی"
              className="input-theme"
              value={catForm.name_fa}
              onChange={(e) =>
                setCatForm({
                  ...catForm,
                  name_fa: e.target.value,
                  slug: catForm.slug || slugifyFa(e.target.value),
                })
              }
              required
            />
            <input
              placeholder="اسلاگ"
              className="input-theme font-mono text-sm"
              dir="ltr"
              value={catForm.slug}
              onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
            />
            <textarea
              placeholder="توضیح کوتاه"
              className="input-theme min-h-[60px]"
              value={catForm.description}
              onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
            />
            <Button type="submit">{editCatId ? "ذخیره" : "افزودن دسته"}</Button>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl border border-theme px-3 py-2">
                <span>
                  {c.name_fa}
                  <span className="ms-2 text-xs text-muted">({c.post_count ?? 0})</span>
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="text-xs text-muted hover:text-[var(--fg)]"
                    onClick={() => {
                      setEditCatId(c.id);
                      setCatForm({
                        slug: c.slug,
                        name_fa: c.name_fa,
                        description: c.description ?? "",
                      });
                    }}
                  >
                    ویرایش
                  </button>
                  <button type="button" onClick={() => removeCategory(c.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-medium">برچسب‌ها</h2>
          <form onSubmit={saveTag} className="mt-4 flex gap-2 rounded-2xl border border-theme p-4">
            <input
              placeholder="نام برچسب"
              className="input-theme flex-1"
              value={tagForm.name_fa}
              onChange={(e) =>
                setTagForm({
                  ...tagForm,
                  name_fa: e.target.value,
                  slug: tagForm.slug || slugifyFa(e.target.value),
                })
              }
              required
            />
            <Button type="submit">افزودن</Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-2 rounded-full border border-theme px-3 py-1 text-sm"
              >
                #{t.name_fa}
                <button type="button" onClick={() => removeTag(t.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </button>
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

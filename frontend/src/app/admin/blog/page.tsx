"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, Pencil, Plus, Trash2 } from "@/components/icons";

import { Button } from "@/components/ui/Button";
import { adminFetch } from "@/lib/api";
import type { BlogPostAdmin } from "@/lib/blog";
import { formatBlogDate } from "@/lib/blog";
import { STORAGE_KEYS } from "@/lib/storage-keys";

const statusLabels: Record<string, string> = {
  draft: "پیش‌نویس",
  published: "منتشر شده",
  scheduled: "زمان‌بندی",
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPostAdmin[]>([]);
  const [filter, setFilter] = useState<string>("all");

  const token = () => localStorage.getItem(STORAGE_KEYS.adminToken)!;

  const load = () =>
    adminFetch<BlogPostAdmin[]>("/api/v1/admin/blog/posts", token())
      .then(setPosts)
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  async function remove(id: number) {
    if (!confirm("حذف این مقاله؟")) return;
    await adminFetch(`/api/v1/admin/blog/posts/${id}`, token(), { method: "DELETE" });
    load();
  }

  const filtered =
    filter === "all" ? posts : posts.filter((p) => p.status === filter);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">وبلاگ</h1>
          <p className="mt-1 text-sm text-muted">مدیریت مقالات مجله</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/blog/categories" className="chip-theme">
            دسته‌ها و برچسب‌ها
          </Link>
          <Link
            href="/admin/blog/new"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-fg)]"
          >
            <Plus className="h-4 w-4" />
            مقاله جدید
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {[
          { key: "all", label: "همه" },
          { key: "published", label: "منتشر شده" },
          { key: "draft", label: "پیش‌نویس" },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`chip-theme ${filter === key ? "is-active" : ""}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted">مقاله‌ای یافت نشد.</p>
        ) : (
          filtered.map((post) => (
            <div
              key={post.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-theme px-4 py-3"
            >
              {post.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.cover_image_url}
                  alt=""
                  className="h-14 w-20 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-surface text-xs text-muted">
                  بدون تصویر
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/blog/${post.id}`}
                    className="font-medium transition hover:text-[var(--accent)]"
                  >
                    {post.title}
                  </Link>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      post.status === "published"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-[var(--accent-soft)] text-muted"
                    }`}
                  >
                    {statusLabels[post.status] ?? post.status}
                  </span>
                  {post.is_featured ? (
                    <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] text-[var(--accent-fg)]">
                      ویژه
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {post.category?.name_fa ?? "بدون دسته"}
                  {post.published_at ? ` · ${formatBlogDate(post.published_at)}` : ""}
                  {post.view_count != null ? ` · ${post.view_count} بازدید` : ""}
                </p>
              </div>

              <div className="flex gap-1">
                {post.status === "published" ? (
                  <Link
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-theme text-muted transition hover:text-[var(--fg)]"
                    title="مشاهده"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                ) : null}
                <Link
                  href={`/admin/blog/${post.id}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-theme text-muted transition hover:text-[var(--fg)]"
                  title="ویرایش"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-theme text-muted transition hover:text-red-500"
                  onClick={() => remove(post.id)}
                  title="حذف"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

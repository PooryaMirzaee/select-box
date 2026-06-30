"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { BlogPostEditor } from "@/components/admin/BlogPostEditor";
import { adminFetch } from "@/lib/api";
import type { BlogPostAdmin } from "@/lib/blog";
import { slugifyFa } from "@/lib/blog";
import { STORAGE_KEYS } from "@/lib/storage-keys";

export default function AdminBlogNewPage() {
  const router = useRouter();
  const token = () => localStorage.getItem(STORAGE_KEYS.adminToken)!;

  async function save(data: Partial<BlogPostAdmin>) {
    const body = {
      slug: data.slug || slugifyFa(data.title ?? ""),
      title: data.title,
      excerpt: data.excerpt,
      content_html: data.content_html ?? "",
      category_id: data.category_id ?? null,
      tag_ids: data.tag_ids ?? [],
      status: data.status ?? "draft",
      is_featured: data.is_featured ?? false,
      meta_title: data.meta_title,
      meta_description: data.meta_description,
    };
    const created = await adminFetch<BlogPostAdmin>("/api/v1/admin/blog/posts", token(), {
      method: "POST",
      body: JSON.stringify(body),
    });
    router.push(`/admin/blog/${created.id}`);
  }

  return (
    <div>
      <Link href="/admin/blog" className="text-sm text-muted transition hover:text-[var(--fg)]">
        ← بازگشت به لیست
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">مقاله جدید</h1>
      <BlogPostEditor onSave={save} />
    </div>
  );
}

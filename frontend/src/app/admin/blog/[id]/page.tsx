"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BlogPostEditor } from "@/components/admin/BlogPostEditor";
import { Loader2 } from "@/components/icons";
import { adminFetch } from "@/lib/api";
import type { BlogPostAdmin } from "@/lib/blog";
import { STORAGE_KEYS } from "@/lib/storage-keys";

export default function AdminBlogEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<BlogPostAdmin | null>(null);

  const token = () => localStorage.getItem(STORAGE_KEYS.adminToken)!;

  useEffect(() => {
    adminFetch<BlogPostAdmin>(`/api/v1/admin/blog/posts/${id}`, token())
      .then(setPost)
      .catch(() => router.replace("/admin/blog"));
  }, [id, router]);

  async function save(data: Partial<BlogPostAdmin>) {
    const updated = await adminFetch<BlogPostAdmin>(`/api/v1/admin/blog/posts/${id}`, token(), {
      method: "PATCH",
      body: JSON.stringify({
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt,
        content_html: data.content_html,
        category_id: data.category_id,
        tag_ids: data.tag_ids,
        status: data.status,
        is_featured: data.is_featured,
        meta_title: data.meta_title,
        meta_description: data.meta_description,
      }),
    });
    setPost(updated);
  }

  async function uploadCover(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/admin/blog/posts/${id}/cover-image`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      },
    );
    if (!res.ok) throw new Error("upload failed");
    const json = await res.json();
    setPost((p) => (p ? { ...p, cover_image_url: json.cover_image_url, cover_image_key: json.storage_key } : p));
  }

  async function removeCover() {
    await adminFetch(`/api/v1/admin/blog/posts/${id}/cover-image`, token(), { method: "DELETE" });
    setPost((p) => (p ? { ...p, cover_image_url: null, cover_image_key: null } : p));
  }

  if (!post) {
    return (
      <div className="flex items-center justify-center py-20 text-muted">
        <Loader2 className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div>
      <Link href="/admin/blog" className="text-sm text-muted transition hover:text-[var(--fg)]">
        ← بازگشت به لیست
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">ویرایش مقاله</h1>
      <BlogPostEditor
        post={post}
        onSave={save}
        onUploadCover={uploadCover}
        onRemoveCover={removeCover}
      />
    </div>
  );
}

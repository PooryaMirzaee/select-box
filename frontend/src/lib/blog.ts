/**
 * تایپ‌ها و fetchهای وبلاگ
 */

const API_URL =
  typeof window === "undefined"
    ? (process.env.API_URL ?? "http://localhost:8000")
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export type BlogTag = {
  id: number;
  slug: string;
  name_fa: string;
};

export type BlogCategory = {
  id: number;
  slug: string;
  name_fa: string;
  description?: string | null;
  post_count?: number;
};

export type BlogAuthor = {
  id: number;
  display_name: string;
};

export type BlogPostSummary = {
  id: number;
  slug: string;
  title: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
  category?: BlogCategory | null;
  tags?: BlogTag[];
  author?: BlogAuthor | null;
  is_featured?: boolean;
  reading_time_minutes?: number;
  published_at?: string | null;
};

export type BlogPostDetail = BlogPostSummary & {
  content_html: string;
  meta_title?: string | null;
  meta_description?: string | null;
  view_count?: number;
  related?: BlogPostSummary[];
};

export type BlogPostListResponse = {
  items: BlogPostSummary[];
  total: number;
  page: number;
  page_size: number;
};

export type BlogPostAdmin = BlogPostDetail & {
  cover_image_key?: string | null;
  category_id?: number | null;
  tag_ids?: number[];
  author_id?: number | null;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BlogCategoryAdmin = BlogCategory & {
  meta_title?: string | null;
  meta_description?: string | null;
  sort_order?: number;
};

export function fetchBlogPosts(params?: {
  page?: number;
  page_size?: number;
  category?: string;
  tag?: string;
  featured?: boolean;
  q?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.page_size) sp.set("page_size", String(params.page_size));
  if (params?.category) sp.set("category", params.category);
  if (params?.tag) sp.set("tag", params.tag);
  if (params?.featured) sp.set("featured", "true");
  if (params?.q) sp.set("q", params.q);
  const qs = sp.toString();
  return apiFetch<BlogPostListResponse>(`/api/v1/catalog/blog${qs ? `?${qs}` : ""}`, {
    next: { revalidate: 60, tags: ["blog"] },
  } as RequestInit);
}

export function fetchBlogPost(slug: string) {
  return apiFetch<BlogPostDetail>(`/api/v1/catalog/blog/${slug}`, {
    next: { revalidate: 60, tags: [`blog-${slug}`] },
  } as RequestInit);
}

export function fetchBlogCategories() {
  return apiFetch<BlogCategory[]>("/api/v1/catalog/blog/categories", {
    next: { revalidate: 120, tags: ["blog-categories"] },
  } as RequestInit);
}

export function fetchBlogTags() {
  return apiFetch<BlogTag[]>("/api/v1/catalog/blog/tags", {
    next: { revalidate: 120, tags: ["blog-tags"] },
  } as RequestInit);
}

export function fetchBlogSlugs() {
  return apiFetch<{ slugs: string[] }>("/api/v1/catalog/blog/slugs", {
    next: { revalidate: 300, tags: ["blog-slugs"] },
  } as RequestInit);
}

export function formatBlogDate(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function slugifyFa(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

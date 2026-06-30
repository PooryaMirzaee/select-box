import Link from "next/link";
import { ArrowLeft } from "@/components/icons";

import { BlogCard } from "@/components/blog/BlogCard";
import { BlogCategoryChips } from "@/components/blog/BlogFilters";
import type { BlogCategory, BlogPostSummary } from "@/lib/blog";

type Props = {
  posts: BlogPostSummary[];
  categories: BlogCategory[];
  total: number;
  page: number;
  pageSize: number;
  activeCategory?: string;
  activeTag?: string;
  title?: string;
  subtitle?: string;
  basePath?: string;
};

export function BlogListing({
  posts,
  categories,
  total,
  page,
  pageSize,
  activeCategory,
  activeTag,
  title = "مجله CORALAY",
  subtitle = "ایده‌ها، ترندها و راهنمای طراحی برای چاپ و فروش",
  basePath = "/blog",
}: Props) {
  const featured = posts.find((p) => p.is_featured) ?? posts[0];
  const rest = featured ? posts.filter((p) => p.id !== featured.id) : posts;
  const totalPages = Math.ceil(total / pageSize);

  const pageHref = (p: number) => {
    if (activeCategory) return `${basePath}/category/${activeCategory}?page=${p}`;
    if (activeTag) return `${basePath}/tag/${activeTag}?page=${p}`;
    return `${basePath}?page=${p}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="relative overflow-hidden rounded-3xl border border-theme bg-card p-8 sm:p-12">
        <div className="hero-accent-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">مجله</p>
          <h1 className="mt-2 text-balance text-3xl font-semibold sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-xl text-balance text-muted">{subtitle}</p>
        </div>
      </header>

      <div className="mt-8">
        <BlogCategoryChips
          categories={categories}
          activeCategory={activeCategory}
          activeTag={activeTag}
          basePath={basePath}
        />
      </div>

      {page === 1 && featured && !activeTag ? (
        <div className="mt-8">
          <BlogCard post={featured} variant="featured" priority />
        </div>
      ) : null}

      {rest.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-16 text-center text-muted">
          <p>هنوز مقاله‌ای منتشر نشده است.</p>
          <Link href="/" className="mt-4 inline-flex items-center gap-1 text-sm text-[var(--accent)]">
            بازگشت به فروشگاه
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      {totalPages > 1 ? (
        <nav className="mt-10 flex items-center justify-center gap-2" aria-label="صفحه‌بندی">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="chip-theme">
              قبلی
            </Link>
          ) : null}
          <span className="px-3 text-sm text-muted">
            صفحه {page} از {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="chip-theme">
              بعدی
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

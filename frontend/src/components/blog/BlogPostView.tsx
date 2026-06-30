import Link from "next/link";
import Image from "next/image";
import { Clock, ArrowLeft, Sparkles } from "@/components/icons";

import { BlogCard } from "@/components/blog/BlogCard";
import { ReadingProgress } from "@/components/blog/BlogFilters";
import type { BlogPostDetail } from "@/lib/blog";
import { formatBlogDate } from "@/lib/blog";
import { mediaUrl } from "@/lib/media";

type Props = {
  post: BlogPostDetail;
};

export function BlogPostView({ post }: Props) {
  return (
    <>
      <ReadingProgress />

      <article className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6">
        <nav className="mb-6 text-sm text-muted">
          <Link href="/blog" className="transition hover:text-[var(--fg)]">
            مجله
          </Link>
          {post.category ? (
            <>
              <span className="mx-2">/</span>
              <Link
                href={`/blog/category/${post.category.slug}`}
                className="transition hover:text-[var(--fg)]"
              >
                {post.category.name_fa}
              </Link>
            </>
          ) : null}
        </nav>

        <header className="text-center">
          {post.category ? (
            <Link
              href={`/blog/category/${post.category.slug}`}
              className="inline-flex rounded-full border border-theme px-3 py-1 text-xs font-medium text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
            >
              {post.category.name_fa}
            </Link>
          ) : null}

          <h1 className="mt-4 text-balance text-3xl font-semibold leading-tight sm:text-4xl">
            {post.title}
          </h1>

          {post.excerpt ? (
            <p className="mx-auto mt-4 max-w-2xl text-balance text-base leading-relaxed text-muted sm:text-lg">
              {post.excerpt}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted">
            {post.author ? <span>{post.author.display_name}</span> : null}
            {post.published_at ? (
              <time dateTime={post.published_at}>{formatBlogDate(post.published_at)}</time>
            ) : null}
            {post.reading_time_minutes ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {post.reading_time_minutes} دقیقه مطالعه
              </span>
            ) : null}
          </div>
        </header>

        {post.cover_image_url ? (
          <div className="relative mt-10 aspect-[2/1] overflow-hidden rounded-2xl border border-theme">
            <Image
              src={mediaUrl(post.cover_image_url)}
              alt={post.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        ) : null}

        <div
          className="blog-prose mt-10"
          dangerouslySetInnerHTML={{ __html: post.content_html }}
        />

        {post.tags && post.tags.length > 0 ? (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-theme pt-8">
            {post.tags.map((t) => (
              <Link
                key={t.id}
                href={`/blog/tag/${t.slug}`}
                className="chip-theme text-xs"
              >
                #{t.name_fa}
              </Link>
            ))}
          </div>
        ) : null}

        <aside className="card-theme mt-10 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-medium">طرح خودت را بساز</p>
            <p className="mt-1 text-sm text-muted">
              با Design Lab تیشرت و هودی اختصاصی طراحی کن و بفروش.
            </p>
          </div>
          <Link
            href="/customize"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--accent-fg)] transition hover:opacity-90"
          >
            شروع Design Lab
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </aside>
      </article>

      {post.related && post.related.length > 0 ? (
        <section className="border-t border-theme bg-surface/50 py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-xl font-semibold">مطالب مرتبط</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {post.related.map((r) => (
                <BlogCard key={r.id} post={r} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

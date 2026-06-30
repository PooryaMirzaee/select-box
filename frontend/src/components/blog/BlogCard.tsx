import Link from "next/link";
import Image from "next/image";
import { Clock, ArrowLeft } from "@/components/icons";

import type { BlogPostSummary } from "@/lib/blog";
import { formatBlogDate } from "@/lib/blog";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

type Props = {
  post: BlogPostSummary;
  variant?: "default" | "featured" | "compact";
  className?: string;
  priority?: boolean;
};

export function BlogCard({ post, variant = "default", className, priority }: Props) {
  const isFeatured = variant === "featured";

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-theme bg-card transition duration-300 hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] hover:shadow-[var(--shadow-soft)]",
        isFeatured && "md:flex-row md:min-h-[320px]",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-surface",
          isFeatured ? "md:w-1/2 min-h-[200px] md:min-h-full" : "aspect-[16/10]",
        )}
      >
        {post.cover_image_url ? (
          <Image
            src={mediaUrl(post.cover_image_url)}
            alt={post.title}
            fill
            priority={priority}
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes={isFeatured ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 100vw, 33vw"}
          />
        ) : (
          <div className="absolute inset-0 hero-accent-glow" aria-hidden />
        )}
        {post.is_featured && variant !== "featured" ? (
          <span className="absolute start-3 top-3 rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--accent-fg)]">
            ویژه
          </span>
        ) : null}
      </div>

      <div className={cn("flex flex-1 flex-col p-5", isFeatured && "md:justify-center md:p-8")}>
        {post.category ? (
          <span className="mb-2 text-xs font-medium text-[var(--accent)]">{post.category.name_fa}</span>
        ) : null}

        <h2
          className={cn(
            "font-semibold leading-snug transition group-hover:text-[var(--accent)]",
            isFeatured ? "text-xl sm:text-2xl" : "text-base sm:text-lg",
          )}
        >
          {post.title}
        </h2>

        {post.excerpt ? (
          <p className={cn("mt-2 line-clamp-2 text-sm leading-relaxed text-muted", isFeatured && "line-clamp-3")}>
            {post.excerpt}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-4 text-xs text-muted">
          {post.published_at ? <time>{formatBlogDate(post.published_at)}</time> : null}
          {post.reading_time_minutes ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {post.reading_time_minutes} دقیقه
            </span>
          ) : null}
          <span className="ms-auto inline-flex items-center gap-1 font-medium text-[var(--accent)] opacity-0 transition group-hover:opacity-100">
            مطالعه
            <ArrowLeft className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

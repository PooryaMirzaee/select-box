import Link from "next/link";

import type { CategoryCardItem } from "@/components/shop/CategoryCard";
import { browseHref } from "@/lib/browse-path";
import { mediaUrl } from "@/lib/media";
import { ArrowLeft, Grid3X3 } from "@/components/icons";

type Props = {
  categories: CategoryCardItem[];
  title?: string;
  limit?: number;
};

/** شبکه دایره‌ای دسته‌ها — الگوی فروشگاه‌های بزرگ */
export function HomeCategoryCircles({
  categories,
  title = "دسته‌بندی‌ها",
  limit = 12,
}: Props) {
  const items = categories.slice(0, limit);
  if (!items.length) return null;

  return (
    <section className="shop-container py-5 sm:py-7">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
        <Link
          href="/browse"
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)]"
        >
          همه
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 sm:gap-4 lg:grid-cols-8">
        {items.map((c) => {
          const img = mediaUrl(c.image_url);
          return (
            <Link
              key={c.id}
              href={browseHref(c.path)}
              className="group flex flex-col items-center gap-2 rounded-xl p-1.5 transition hover:bg-[var(--bg-elevated)]"
            >
              <span className="relative flex h-[4.25rem] w-[4.25rem] items-center justify-center overflow-hidden rounded-full border border-theme bg-card shadow-[var(--shadow-card)] transition group-hover:border-[var(--accent)] group-hover:shadow-[0_0_0_3px_var(--accent-soft)] sm:h-[5rem] sm:w-[5rem]">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-lg text-[var(--accent)] sm:text-xl">
                    {c.name_fa.charAt(0)}
                  </span>
                )}
              </span>
              <span className="line-clamp-2 max-w-[5.5rem] text-center text-[11px] font-medium leading-snug sm:text-xs">
                {c.name_fa}
              </span>
            </Link>
          );
        })}
        <Link
          href="/browse"
          className="group flex flex-col items-center gap-2 rounded-xl p-1.5 transition hover:bg-[var(--bg-elevated)]"
        >
          <span className="flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full border border-dashed border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--accent)] sm:h-[5rem] sm:w-[5rem]">
            <Grid3X3 className="h-6 w-6" />
          </span>
          <span className="text-[11px] font-medium text-[var(--accent)] sm:text-xs">همه دسته‌ها</span>
        </Link>
      </div>
    </section>
  );
}

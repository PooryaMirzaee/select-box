"use client";

import Link from "next/link";

import type { CategoryCardItem } from "@/components/shop/CategoryCard";
import { browseHref } from "@/lib/browse-path";
import { cn } from "@/lib/utils";

export type BrowseCategory = CategoryCardItem & { child_count?: number };

type Props = {
  categories: BrowseCategory[];
  baseHref: string;
  queryType?: string;
};

function tileHref(_base: string, path: string, type?: string) {
  const q = type ? `?type=${type}` : "";
  return `${browseHref(path)}${q}`;
}

function CircleThumb({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  return (
    <span
      className={cn(
        "relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full",
        "border border-theme bg-[var(--bg-elevated)] sm:h-[4.5rem] sm:w-[4.5rem]",
        "transition group-hover:border-[var(--accent)] group-hover:shadow-[0_0_0_3px_var(--accent-soft)]",
      )}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="font-display text-lg text-[var(--accent)] sm:text-xl">{name.charAt(0)}</span>
      )}
    </span>
  );
}

/** زیردسته‌های browse — همان ظاهر دایره‌ای نوار بالای سایت */
export function CategoryBrowseGrid({ categories, baseHref, queryType }: Props) {
  if (!categories.length) return null;

  return (
    <ul className="flex flex-wrap justify-center gap-x-2 gap-y-4 sm:justify-start sm:gap-x-3 sm:gap-y-5">
      {categories.map((c) => (
        <li key={c.id} className="w-[4.75rem] sm:w-[5.25rem]">
          <Link
            href={tileHref(baseHref, c.path, queryType)}
            className="group flex flex-col items-center gap-2 rounded-xl px-1 py-1.5 transition hover:bg-[var(--bg-elevated)]"
          >
            <CircleThumb name={c.name_fa} imageUrl={c.image_url} />
            <span className="line-clamp-2 max-w-full text-center text-[11px] leading-tight text-muted group-hover:text-[var(--fg)] sm:text-xs">
              {c.name_fa}
            </span>
            {(c.child_count ?? 0) > 0 ? (
              <span className="sr-only">{c.child_count} زیردسته</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

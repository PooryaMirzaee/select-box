"use client";

import type { CategoryCardItem } from "@/components/shop/CategoryCard";
import { HeroCategoryTile } from "@/components/shop/HeroCategoryTile";
import { cn } from "@/lib/utils";

export type BrowseCategory = CategoryCardItem & { child_count?: number };

type Props = {
  categories: BrowseCategory[];
  baseHref: string;
  queryType?: string;
};

function tileHref(base: string, path: string, type?: string) {
  const q = type ? `?type=${type}` : "";
  return `${base}/${path}${q}`;
}

function subtitle(c: BrowseCategory) {
  const n = c.child_count ?? 0;
  return n > 0 ? `${n} زیردسته` : "ورود";
}

export function CategoryBrowseGrid({ categories, baseHref, queryType }: Props) {
  if (!categories.length) return null;

  return (
    <>
      <div
        className={cn(
          "flex gap-3 overflow-x-auto pb-1 md:hidden",
          "-mx-4 px-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {categories.map((c, i) => (
          <div key={c.id} className="w-[44vw] max-w-[210px] shrink-0 snap-center">
            <HeroCategoryTile
              category={c}
              href={tileHref(baseHref, c.path, queryType)}
              index={i}
              subtitle={subtitle(c)}
              className="min-h-[128px]"
            />
          </div>
        ))}
      </div>

      <ul className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c, i) => (
          <li key={c.id}>
            <HeroCategoryTile
              category={c}
              href={tileHref(baseHref, c.path, queryType)}
              index={i}
              subtitle={subtitle(c)}
              className="min-h-[148px]"
            />
          </li>
        ))}
      </ul>
    </>
  );
}

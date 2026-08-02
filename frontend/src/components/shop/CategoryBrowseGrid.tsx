"use client";

import type { CategoryCardItem } from "@/components/shop/CategoryCard";
import { HeroCategoryTile } from "@/components/shop/HeroCategoryTile";
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

function subtitle(c: BrowseCategory) {
  const n = c.child_count ?? 0;
  return n > 0 ? `${n} زیردسته` : "مشاهده محصولات";
}

export function CategoryBrowseGrid({ categories, baseHref, queryType }: Props) {
  if (!categories.length) return null;

  const featured = categories.length >= 5 ? categories.slice(0, 2) : [];
  const rest = featured.length ? categories.slice(2) : categories;

  return (
    <div className="space-y-3">
      {featured.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {featured.map((c, i) => (
            <li key={c.id}>
              <HeroCategoryTile
                category={c}
                href={tileHref(baseHref, c.path, queryType)}
                index={i}
                size="featured"
                subtitle={subtitle(c)}
              />
            </li>
          ))}
        </ul>
      ) : null}

      <div
        className={cn(
          "flex gap-3 overflow-x-auto pb-1 md:hidden",
          "-mx-4 px-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          featured.length > 0 && "mt-1",
        )}
      >
        {(featured.length ? rest : categories).map((c, i) => (
          <div key={c.id} className="w-[42vw] max-w-[200px] shrink-0 snap-center">
            <HeroCategoryTile
              category={c}
              href={tileHref(baseHref, c.path, queryType)}
              index={i + featured.length}
              subtitle={subtitle(c)}
              className="min-h-[132px]"
            />
          </div>
        ))}
      </div>

      <ul
        className={cn(
          "hidden gap-3 sm:grid",
          rest.length <= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        )}
      >
        {(featured.length ? rest : categories).map((c, i) => (
          <li key={c.id} className={featured.length ? undefined : undefined}>
            <HeroCategoryTile
              category={c}
              href={tileHref(baseHref, c.path, queryType)}
              index={i + featured.length}
              subtitle={subtitle(c)}
              className="min-h-[148px]"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

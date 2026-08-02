"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Grid3X3 } from "@/components/icons";
import { browseHref } from "@/lib/browse-path";
import type { CategoryNavNode } from "@/lib/category-nav";
import { cn } from "@/lib/utils";

type Props = {
  categories: CategoryNavNode[];
};

function Thumb({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl?: string | null;
}) {
  return (
    <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-theme bg-[var(--bg-elevated)] transition group-hover:border-[var(--accent)] group-hover:shadow-[0_0_0_3px_var(--accent-soft)]">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="font-display text-sm text-[var(--accent)]">{name.charAt(0)}</span>
      )}
    </span>
  );
}

/** نوار افقی همه دسته‌های ریشه — زیر هدر */
export function CategoryIconStrip({ categories }: Props) {
  const pathname = usePathname();
  if (!categories.length) return null;

  return (
    <div className="border-t border-theme/70 bg-[var(--bg)]/80">
      <div className="mx-auto max-w-6xl">
        <nav
          aria-label="دسته‌بندی‌ها"
          className="no-scrollbar flex gap-1 overflow-x-auto px-3 py-2.5 sm:gap-2 sm:px-6"
        >
          <Link
            href="/browse"
            className={cn(
              "group flex min-w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-xl px-2 py-1.5 transition",
              pathname === "/browse" || pathname === "/browse/"
                ? "bg-[var(--accent-soft)]"
                : "hover:bg-[var(--bg-elevated)]",
            )}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)] transition group-hover:border-[var(--accent)]">
              <Grid3X3 className="h-5 w-5" />
            </span>
            <span className="max-w-[4.75rem] truncate text-center text-[11px] font-medium leading-tight">
              همه
            </span>
          </Link>

          {categories.map((cat) => {
            const href = browseHref(cat.path);
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={cat.id}
                href={href}
                className={cn(
                  "group flex min-w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-xl px-2 py-1.5 transition",
                  active ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-elevated)]",
                )}
              >
                <Thumb name={cat.name_fa} imageUrl={cat.image_url} />
                <span
                  className={cn(
                    "max-w-[4.75rem] truncate text-center text-[11px] leading-tight",
                    active ? "font-semibold text-[var(--accent)]" : "text-muted",
                  )}
                >
                  {cat.name_fa}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

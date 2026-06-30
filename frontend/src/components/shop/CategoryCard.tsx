import Link from "next/link";
import { ChevronLeft } from "@/components/icons";

import { cn } from "@/lib/utils";

export type CategoryCardItem = {
  id: number;
  slug: string;
  name_fa: string;
  path: string;
  image_url?: string | null;
};

type Props = {
  category: CategoryCardItem;
  href: string;
  className?: string;
};

export function CategoryCard({ category, href, className }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-[88px] items-center gap-4 rounded-2xl border border-theme bg-card p-4 transition",
        "active:scale-[0.99] hover:border-[var(--accent)]/40",
        className,
      )}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--bg)]">
        {category.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={category.image_url}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted">
            {category.name_fa.charAt(0)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug">{category.name_fa}</p>
      </div>
      <ChevronLeft className="h-4 w-4 shrink-0 rotate-180 text-muted transition group-hover:text-[var(--fg)]" />
    </Link>
  );
}

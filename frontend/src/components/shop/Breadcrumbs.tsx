import Link from "next/link";
import { ChevronLeft } from "@/components/icons";

export type Crumb = { name_fa: string; path: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (!items.length) return null;
  return (
    <nav aria-label="مسیر" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted">
      <Link href="/browse" className="hover:text-[var(--fg)]">
        فروشگاه
      </Link>
      {items.map((c, i) => {
        const isLast = i === items.length - 1;
        const href = c.path.startsWith("product/") ? `/${c.path}` : `/browse/${c.path}`;
        return (
          <span key={`${c.path}-${i}`} className="flex items-center gap-1">
            <ChevronLeft className="h-3 w-3  opacity-50" />
            {isLast ? (
              <span className="text-[var(--fg)]">{c.name_fa}</span>
            ) : (
              <Link href={href} className="hover:text-[var(--fg)]">
                {c.name_fa}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

import Link from "next/link";

import type { ProductSummary } from "@/lib/api";
import { ProductCard } from "@/components/shop/ProductCard";
import { ArrowLeft } from "@/components/icons";

type Props = {
  title: string;
  subtitle?: string;
  products: ProductSummary[];
  href?: string;
  hrefLabel?: string;
};

/** ریل افقی محصولات — پرفروش / جدید / … */
export function ProductRail({
  title,
  subtitle,
  products,
  href = "/catalog",
  hrefLabel = "مشاهده همه",
}: Props) {
  if (!products.length) return null;

  return (
    <section className="shop-container py-5 sm:py-7">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-muted sm:text-sm">{subtitle}</p> : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--accent)] transition hover:opacity-80"
          >
            {hrefLabel}
            <ArrowLeft className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
      <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 sm:gap-3 md:grid md:grid-cols-4 md:overflow-visible lg:grid-cols-5 xl:grid-cols-6">
        {products.map((p, i) => (
          <div key={p.id} className="w-[9.75rem] shrink-0 sm:w-[11rem] md:w-auto">
            <ProductCard product={p} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}

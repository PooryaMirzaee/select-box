import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/shop/ProductCard";
import { fetchProducts, fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";

export const revalidate = 60;

type Props = { searchParams: Promise<{ tshirt?: string; hoodie?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const filter =
    sp.hoodie !== undefined ? "hoodie" : sp.tshirt !== undefined ? "tshirt" : undefined;
  const settings = await fetchShopSettings().catch(() => null);
  const siteUrl = getSiteUrl(settings);
  const shopName = settings?.shop_name ?? BRAND_NAME;

  let title = `کاتالوگ محصولات`;
  if (filter === "tshirt") title = "تیشرت — کاتالوگ";
  else if (filter === "hoodie") title = "هودی — کاتالوگ";

  const description = `همهٔ تیشرت و هودی‌های ${shopName} — مرور و خرید آنلاین.`;

  return buildPageMetadata({
    title,
    description,
    canonical: `${siteUrl}/catalog`,
    shopName,
    noindex: Boolean(filter),
  });
}

export default async function CatalogPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filter = sp.hoodie !== undefined ? "hoodie" : sp.tshirt !== undefined ? "tshirt" : undefined;
  const products = await fetchProducts(filter).catch(() => []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-semibold sm:text-3xl">کاتالوگ</h1>
      <p className="mt-2 text-sm text-muted">
        {filter ? (filter === "tshirt" ? "تیشرت" : "هودی") : "همه محصولات"}
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link
          href="/catalog"
          className={`chip-theme ${!filter ? "is-active" : ""}`}
        >
          همه
        </Link>
        <Link
          href="/catalog?tshirt"
          className={`chip-theme ${filter === "tshirt" ? "is-active" : ""}`}
        >
          تیشرت
        </Link>
        <Link
          href="/catalog?hoodie"
          className={`chip-theme ${filter === "hoodie" ? "is-active" : ""}`}
        >
          هودی
        </Link>
        <Link href="/browse" className="chip-theme">
          دسته موضوعی
        </Link>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>
      {products.length === 0 ? (
        <p className="mt-12 text-center text-sm text-muted">محصولی یافت نشد — seed را اجرا کنید.</p>
      ) : null}
    </div>
  );
}

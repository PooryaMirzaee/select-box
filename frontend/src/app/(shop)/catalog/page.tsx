import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/shop/ProductCard";
import { SearchBar } from "@/components/shop/SearchBar";
import { fetchProducts, fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";

export const revalidate = 60;

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchShopSettings().catch(() => null);
  const siteUrl = getSiteUrl(settings);
  const shopName = settings?.shop_name ?? BRAND_NAME;

  return buildPageMetadata({
    title: "کاتالوگ محصولات",
    description: `خرید لوازم خانگی و سبک زندگی از ${shopName} — یخچال، ماشین لباسشویی، لوازم روزمره و بیشتر.`,
    canonical: `${siteUrl}/catalog`,
    shopName,
  });
}

export default async function CatalogPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const products = await fetchProducts(undefined, query || undefined).catch(() => []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-semibold sm:text-3xl">
        {query ? `نتایج «${query}»` : "کاتالوگ"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {query
          ? `${products.length.toLocaleString("fa-IR")} محصول پیدا شد`
          : "همه محصولات — لوازم خانگی و سبک زندگی"}
      </p>
      <SearchBar className="mt-4 max-w-md md:hidden" />
      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 text-sm">
        <Link href="/browse" className="chip-theme shrink-0">
          دسته‌بندی‌ها
        </Link>
        <Link href="/browse/kitchen" className="chip-theme shrink-0">
          آشپزخانه
        </Link>
        <Link href="/browse/lifestyle" className="chip-theme shrink-0">
          سبک زندگی
        </Link>
        {query ? (
          <Link href="/catalog" className="chip-theme is-active shrink-0">
            حذف جستجو ✕
          </Link>
        ) : null}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>
      {products.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-muted">
            {query ? `برای «${query}» محصولی پیدا نشد.` : "محصولی یافت نشد."}
          </p>
          {query ? (
            <Link
              href="/catalog"
              className="mt-4 inline-flex min-h-[44px] items-center rounded-full border border-theme px-6 text-sm transition hover:bg-[var(--bg-elevated)]"
            >
              مشاهده همه محصولات
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

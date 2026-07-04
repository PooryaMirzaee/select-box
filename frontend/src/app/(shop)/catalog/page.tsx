import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/shop/ProductCard";
import { fetchProducts, fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";

export const revalidate = 60;

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

export default async function CatalogPage() {
  const products = await fetchProducts().catch(() => []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-semibold sm:text-3xl">کاتالوگ</h1>
      <p className="mt-2 text-sm text-muted">همه محصولات — لوازم خانگی و سبک زندگی</p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href="/browse" className="chip-theme">
          دسته‌بندی‌ها
        </Link>
        <Link href="/browse/kitchen" className="chip-theme">
          آشپزخانه
        </Link>
        <Link href="/browse/lifestyle" className="chip-theme">
          سبک زندگی
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

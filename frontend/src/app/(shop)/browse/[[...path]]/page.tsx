import type { Metadata } from "next";
import Link from "next/link";

import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { Breadcrumbs, type Crumb } from "@/components/shop/Breadcrumbs";
import { CategoryBrowseGrid } from "@/components/shop/CategoryBrowseGrid";
import { ProductCard } from "@/components/shop/ProductCard";
import { fetchBrowse, fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { appendTypeToTitle, browseCanonical, buildPageMetadata, getSiteUrl, productTypeLabel } from "@/lib/seo";

type Props = {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<{ type?: string }>;
};

export const revalidate = 60;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { path: segments } = await params;
  const sp = await searchParams;
  const pathStr = segments?.join("/") ?? "";

  const [data, settings] = await Promise.all([
    fetchBrowse(pathStr, sp.type).catch(() => null),
    fetchShopSettings().catch(() => null),
  ]);

  const siteUrl = getSiteUrl(settings);

  if (!data || data.error) {
    return { title: "دسته یافت نشد", robots: { index: false, follow: false } };
  }

  const shopName = settings?.shop_name ?? BRAND_NAME;

  let title: string;
  let description: string | undefined;

  if (data.current) {
    title = data.current.meta_title ?? data.current.name_fa;
    description =
      data.current.meta_description ??
      `خرید تیشرت و هودی ${data.current.name_fa} — ${shopName}`;
  } else {
    title = "دسته‌بندی‌ها";
    description =
      settings?.default_meta_description ??
      settings?.shop_description ??
      "مرور دسته‌های موضوعی فروشگاه";
  }

  title = appendTypeToTitle(title, sp.type);

  const ogImage = data.current?.image_url;
  const hasTypeFilter = Boolean(sp.type);

  return buildPageMetadata({
    title,
    description,
    canonical: browseCanonical(siteUrl, pathStr),
    shopName,
    ogImage,
    noindex: hasTypeFilter,
  });
}

export default async function BrowsePage({ params, searchParams }: Props) {
  const { path: segments } = await params;
  const sp = await searchParams;
  const pathStr = segments?.join("/") ?? "";
  const data = await fetchBrowse(pathStr, sp.type).catch(() => null);
  const settings = await fetchShopSettings().catch(() => null);
  const siteUrl = getSiteUrl(settings);

  if (!data || data.error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted">دسته یافت نشد.</div>
    );
  }

  const crumbs: Crumb[] = data.breadcrumbs.map((b) => ({
    name_fa: b.name_fa,
    path: b.path,
  }));

  const typeLabel = productTypeLabel(sp.type);

  return (
    <>
      <BreadcrumbJsonLd items={data.breadcrumbs} siteUrl={siteUrl} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <Breadcrumbs items={crumbs} />

        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {typeLabel ? `${typeLabel} — ` : ""}
            {data.current?.name_fa ?? "دسته‌بندی"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {data.children.length
              ? "یک زیرمجموعه را انتخاب کنید"
              : data.products.length
                ? `${data.products.length} محصول`
                : "محصولی در این دسته نیست"}
          </p>
          {data.current?.meta_description ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
              {data.current.meta_description}
            </p>
          ) : null}
        </div>

        {data.children.length > 0 ? (
          <CategoryBrowseGrid
            categories={data.children}
            baseHref="/browse"
            queryType={sp.type}
          />
        ) : null}

        {data.products.length > 0 ? (
          <>
            <div className="mb-6 flex flex-wrap gap-2 text-sm">
              <Link
                href={`/browse/${pathStr}`}
                className={`chip-theme ${!sp.type ? "is-active" : ""}`}
              >
                همه
              </Link>
              <Link
                href={`/browse/${pathStr}?type=tshirt`}
                className={`chip-theme ${sp.type === "tshirt" ? "is-active" : ""}`}
              >
                تیشرت
              </Link>
              <Link
                href={`/browse/${pathStr}?type=hoodie`}
                className={`chip-theme ${sp.type === "hoodie" ? "is-active" : ""}`}
              >
                هودی
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
              {data.products.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

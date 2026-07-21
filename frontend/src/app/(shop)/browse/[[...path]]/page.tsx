import type { Metadata } from "next";
import { redirect } from "next/navigation";

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

  let data = null;
  let fetchFailed = false;
  try {
    data = await fetchBrowse(pathStr, sp.type);
  } catch {
    fetchFailed = true;
  }
  const settings = await fetchShopSettings().catch(() => null);
  const siteUrl = getSiteUrl(settings);

  if (fetchFailed) {
    return { title: "خطا در بارگذاری", robots: { index: false, follow: false } };
  }
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
      `خرید ${data.current.name_fa} — ${shopName}`;
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
  const canonicalPath = data.canonical_path || pathStr;

  return buildPageMetadata({
    title,
    description,
    canonical: browseCanonical(siteUrl, canonicalPath),
    shopName,
    ogImage,
    noindex: hasTypeFilter,
  });
}

export default async function BrowsePage({ params, searchParams }: Props) {
  const { path: segments } = await params;
  const sp = await searchParams;
  const pathStr = segments?.join("/") ?? "";

  let data = null;
  let fetchFailed = false;
  try {
    data = await fetchBrowse(pathStr, sp.type);
  } catch {
    fetchFailed = true;
  }
  const settings = await fetchShopSettings().catch(() => null);
  const siteUrl = getSiteUrl(settings);

  if (fetchFailed) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <p className="text-muted">ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.</p>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted">دسته یافت نشد.</div>
    );
  }

  if (data.canonical_path && pathStr && data.canonical_path !== pathStr && !sp.type) {
    redirect(`/browse/${data.canonical_path}`);
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
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            {data.products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}

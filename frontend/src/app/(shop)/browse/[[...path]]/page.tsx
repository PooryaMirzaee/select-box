import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { Breadcrumbs, type Crumb } from "@/components/shop/Breadcrumbs";
import { CategoryBrowseGrid } from "@/components/shop/CategoryBrowseGrid";
import { ProductCard } from "@/components/shop/ProductCard";
import { fetchBrowse, fetchCategoryNav, fetchShopSettings } from "@/lib/api";
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
      `مرور دسته‌های موضوعی ${shopName}`;
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
  const isRoot = !pathStr;

  let data = null;
  let fetchFailed = false;
  try {
    data = await fetchBrowse(pathStr, sp.type);
  } catch {
    fetchFailed = true;
  }
  const [settings, categoryNav] = await Promise.all([
    fetchShopSettings().catch(() => null),
    fetchCategoryNav().catch(() => []),
  ]);
  const siteUrl = getSiteUrl(settings);
  const shopName = settings?.shop_name ?? BRAND_NAME;

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
  const title = data.current?.name_fa ?? "دسته‌بندی‌ها";
  const productCount = data.products.length;
  const childCount = data.children.length;

  return (
    <>
      <BreadcrumbJsonLd items={data.breadcrumbs} siteUrl={siteUrl} />

      {/* هیرو دسته */}
      <section className="relative overflow-hidden border-b border-theme bg-[var(--bg-elevated)]">
        {data.current?.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.current.image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-25 dark:opacity-20"
          />
        ) : (
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,var(--accent-soft),transparent_55%)]"
            aria-hidden
          />
        )}
        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <Breadcrumbs items={crumbs} />
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-wide text-[var(--accent)]">
                {isRoot ? shopName : "دسته‌بندی"}
              </p>
              <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
                {typeLabel ? `${typeLabel} — ` : ""}
                {title}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {data.current?.meta_description?.trim() ||
                  (isRoot
                    ? `همه دسته‌های ${shopName} را ببینید و محصول موردنظر را سریع پیدا کنید.`
                    : childCount
                      ? `${childCount.toLocaleString("fa-IR")} زیردسته برای انتخاب`
                      : productCount
                        ? `${productCount.toLocaleString("fa-IR")} محصول در این دسته`
                        : "محصولی در این دسته ثبت نشده است.")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {childCount > 0 ? (
                <span className="rounded-full border border-theme bg-card px-3 py-1.5 text-muted">
                  {childCount.toLocaleString("fa-IR")} زیردسته
                </span>
              ) : null}
              {productCount > 0 ? (
                <span className="rounded-full border border-theme bg-card px-3 py-1.5 text-muted">
                  {productCount.toLocaleString("fa-IR")} محصول
                </span>
              ) : null}
              <Link
                href="/catalog"
                className="rounded-full border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-1.5 font-medium text-[var(--accent)] transition hover:border-[var(--accent)]"
              >
                همه محصولات
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className={childCount > 0 && !isRoot ? "lg:grid lg:grid-cols-[220px_1fr] lg:gap-10" : ""}>
          {/* سایدبار ریشه در صفحات زیردسته */}
          {!isRoot && categoryNav.length > 0 ? (
            <aside className="mb-8 hidden lg:block">
              <p className="mb-3 text-xs font-semibold tracking-wide text-muted">دسته‌های اصلی</p>
              <ul className="space-y-1">
                {categoryNav.map((root) => {
                  const href = `/browse/${root.path}`;
                  const active = pathStr === root.path || pathStr.startsWith(`${root.path}/`);
                  return (
                    <li key={root.id}>
                      <Link
                        href={href}
                        className={`block rounded-xl px-3 py-2.5 text-sm transition ${
                          active
                            ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                            : "text-muted hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]"
                        }`}
                      >
                        {root.name_fa}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </aside>
          ) : null}

          <div>
            {childCount > 0 ? (
              <section className="mb-10">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 className="font-display text-lg sm:text-xl">
                    {isRoot ? "همه دسته‌ها" : "زیردسته‌ها"}
                  </h2>
                </div>
                <CategoryBrowseGrid
                  categories={data.children}
                  baseHref="/browse"
                  queryType={sp.type}
                />
              </section>
            ) : null}

            {productCount > 0 ? (
              <section>
                {childCount > 0 ? (
                  <h2 className="mb-5 font-display text-lg sm:text-xl">محصولات این دسته</h2>
                ) : null}
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {data.products.map((p, i) => (
                    <ProductCard key={p.id} product={p} index={i} />
                  ))}
                </div>
              </section>
            ) : null}

            {!childCount && !productCount ? (
              <div className="rounded-2xl border border-dashed border-theme bg-[var(--bg-elevated)] px-6 py-16 text-center">
                <p className="font-display text-lg">هنوز محصولی اینجا نیست</p>
                <p className="mt-2 text-sm text-muted">از همه محصولات یا دسته‌های دیگر شروع کنید.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/catalog"
                    className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--accent)] px-6 text-sm font-medium text-[var(--accent-fg)]"
                  >
                    همه محصولات
                  </Link>
                  <Link
                    href="/browse"
                    className="inline-flex min-h-[44px] items-center rounded-full border border-theme px-6 text-sm"
                  >
                    همه دسته‌ها
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

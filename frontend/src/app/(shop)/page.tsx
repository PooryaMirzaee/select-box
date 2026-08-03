import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { WebSiteJsonLd } from "@/components/seo/WebSiteJsonLd";
import { HomeBannerCarousel } from "@/components/shop/HomeBannerCarousel";
import { HomePromoBanner } from "@/components/shop/HomePromoBanner";
import { Hero } from "@/components/shop/Hero";
import { ProductCard } from "@/components/shop/ProductCard";
import { TrustStrip } from "@/components/shop/TrustStrip";
import {
  fetchBrowse,
  fetchHomeBanners,
  fetchHomepageConfig,
  fetchProducts,
  fetchShopSettings,
} from "@/lib/api";
import { BRAND_NAME, BRAND_TITLE } from "@/lib/brand";
import { DEFAULT_HOMEPAGE_CONFIG, isSectionEnabled } from "@/lib/homepage";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchShopSettings().catch(() => null);
  const siteUrl = getSiteUrl(settings);
  const shopName = settings?.shop_name ?? BRAND_NAME;
  const title = settings?.default_meta_title ?? BRAND_TITLE;
  const description =
    settings?.default_meta_description ??
    settings?.shop_description ??
    "خرید آنلاین لوازم خانگی و سبک زندگی با گارانتی اصلی.";

  return buildPageMetadata({ title, description, canonical: siteUrl, shopName });
}

function DefaultPromoSections() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="card-theme relative overflow-hidden p-8 sm:p-10">
          <div
            className="pointer-events-none absolute -end-16 -top-16 h-48 w-48 rounded-full bg-[var(--accent-soft)] blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium tracking-wide text-[var(--accent)]">سفارش عمده</p>
              <h2 className="mt-2 text-xl font-semibold sm:text-2xl">تأمین لوازم خانگی برای پروژه‌ها</h2>
              <p className="mt-2 max-w-md text-sm text-muted">
                برای ساختمان، هتل و سازمان‌ها — قیمت پلکانی، گارانتی اصلی و پیش‌فاکتور رسمی.
              </p>
            </div>
            <Link
              href="/business"
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-full border border-theme px-8 text-sm font-medium transition hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] hover:bg-[var(--bg-elevated)]"
            >
              سفارش عمده
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="card-theme relative overflow-hidden p-8 sm:p-10">
          <div
            className="pointer-events-none absolute -start-20 -top-20 h-56 w-56 rounded-full bg-[var(--accent-soft)] blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium tracking-wide text-[var(--accent)]">گارانتی اصلی</p>
              <h2 className="mt-2 text-xl font-semibold sm:text-2xl">خرید مطمئن از فروشگاه دشتستان</h2>
              <p className="mt-2 max-w-md text-sm text-muted">
                تمام محصولات با گارانتی معتبر، ارسال سریع و پشتیبانی تخصصی — از یخچال تا لوازم روزمره.
              </p>
            </div>
            <Link
              href="/catalog"
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-8 text-sm font-medium text-[var(--accent-fg)] transition hover:opacity-90"
            >
              مشاهده همه محصولات
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default async function HomePage() {
  const [browse, settings, homepage, heroBanners, promoBanners] = await Promise.all([
    fetchBrowse("").catch(() => null),
    fetchShopSettings().catch(() => null),
    fetchHomepageConfig().catch(() => DEFAULT_HOMEPAGE_CONFIG),
    fetchHomeBanners("hero").catch(() => []),
    fetchHomeBanners("promo").catch(() => []),
  ]);

  const config = {
    ...DEFAULT_HOMEPAGE_CONFIG,
    ...homepage,
    sections: homepage?.sections?.length ? homepage.sections : DEFAULT_HOMEPAGE_CONFIG.sections,
    hero: { ...DEFAULT_HOMEPAGE_CONFIG.hero, ...homepage?.hero },
    featured: {
      ...DEFAULT_HOMEPAGE_CONFIG.featured,
      ...homepage?.featured,
      product_ids: homepage?.featured?.product_ids ?? DEFAULT_HOMEPAGE_CONFIG.featured.product_ids,
      mode: homepage?.featured?.mode ?? DEFAULT_HOMEPAGE_CONFIG.featured.mode,
      category_id:
        homepage?.featured?.category_id !== undefined
          ? homepage.featured.category_id
          : DEFAULT_HOMEPAGE_CONFIG.featured.category_id,
    },
  };
  const categories = browse?.children ?? [];

  let featuredProducts: Awaited<ReturnType<typeof fetchProducts>>["items"] = [];
  if (isSectionEnabled(config, "featured")) {
    const count = config.featured.product_count;
    try {
      if (config.featured.mode === "manual" && config.featured.product_ids.length) {
        const ids = config.featured.product_ids.slice(0, count);
        const res = await fetchProducts(undefined, undefined, { ids });
        featuredProducts = res.items;
      } else if (config.featured.mode === "category" && config.featured.category_id != null) {
        const res = await fetchProducts(undefined, undefined, {
          categoryId: config.featured.category_id,
          limit: count,
        });
        featuredProducts = res.items;
      } else {
        // latest (+ سازگاری با parent_slug قدیمی)
        const res = await fetchProducts(config.featured.parent_slug ?? undefined, undefined, {
          limit: Math.max(count, 24),
        });
        featuredProducts = res.items.slice(0, count);
      }
    } catch {
      featuredProducts = [];
    }
  }

  const siteUrl = getSiteUrl(settings);
  const shopName = settings?.shop_name ?? BRAND_NAME;
  const description =
    settings?.default_meta_description ??
    settings?.shop_description ??
    "خرید آنلاین لوازم خانگی و سبک زندگی با گارانتی اصلی.";

  const sectionBlocks: Record<string, ReactNode> = {
    carousel: isSectionEnabled(config, "carousel") ? <HomeBannerCarousel banners={heroBanners} /> : null,
    hero: isSectionEnabled(config, "hero") ? <Hero categories={categories} config={config.hero} /> : null,
    featured: isSectionEnabled(config, "featured") ? (
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold sm:text-2xl">{config.featured.title}</h2>
            {config.featured.subtitle ? (
              <p className="mt-1 text-sm text-muted">{config.featured.subtitle}</p>
            ) : null}
          </div>
          {config.featured.catalog_href ? (
            <Link
              href={config.featured.catalog_href}
              className="text-sm text-muted transition hover:text-[var(--fg)]"
            >
              {config.featured.catalog_label}
            </Link>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {featuredProducts.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
        {featuredProducts.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted">محصولی یافت نشد.</p>
        ) : null}
      </section>
    ) : null,
    promo: isSectionEnabled(config, "promo") ? (
      promoBanners.length > 0 ? (
        <>
          {promoBanners.map((banner) => (
            <HomePromoBanner key={banner.id} banner={banner} />
          ))}
        </>
      ) : config.show_promo_fallback ? (
        <DefaultPromoSections />
      ) : null
    ) : null,
  };

  const [firstSection, ...restSections] = config.sections;

  return (
    <>
      <WebSiteJsonLd siteUrl={siteUrl} name={shopName} description={description} />
      {firstSection ? <div key={firstSection.id}>{sectionBlocks[firstSection.id]}</div> : null}
      <TrustStrip />
      {restSections.map((section) => (
        <div key={section.id}>{sectionBlocks[section.id]}</div>
      ))}
    </>
  );
}

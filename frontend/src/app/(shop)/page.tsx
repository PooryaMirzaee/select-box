import type { Metadata } from "next";
import Link from "next/link";

import { WebSiteJsonLd } from "@/components/seo/WebSiteJsonLd";
import { AmazingDeals } from "@/components/shop/AmazingDeals";
import { HomeBannerCarousel } from "@/components/shop/HomeBannerCarousel";
import { HomeCategoryCircles } from "@/components/shop/HomeCategoryCircles";
import { HomePromoBanner } from "@/components/shop/HomePromoBanner";
import { ProductRail } from "@/components/shop/ProductRail";
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
      <section className="shop-container pb-4 sm:pb-6">
        <div className="relative overflow-hidden rounded-2xl border border-theme bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div
            className="pointer-events-none absolute -end-16 -top-16 h-48 w-48 rounded-full bg-[var(--accent-soft)] blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-[var(--accent)]">سفارش عمده</p>
              <h2 className="mt-1.5 text-xl font-bold sm:text-2xl">تأمین لوازم خانگی برای پروژه‌ها</h2>
              <p className="mt-2 max-w-md text-sm text-muted">
                برای ساختمان، هتل و سازمان‌ها — قیمت پلکانی، گارانتی اصلی و پیش‌فاکتور رسمی.
              </p>
            </div>
            <Link
              href="/business"
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl border border-theme px-8 text-sm font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              سفارش عمده
            </Link>
          </div>
        </div>
      </section>

      <section className="shop-container pb-10 sm:pb-14">
        <div
          className="relative overflow-hidden rounded-2xl p-6 text-white sm:p-8"
          style={{
            background: "linear-gradient(120deg, var(--amazing-from), var(--amazing-to))",
          }}
        >
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-white/85">گارانتی اصلی</p>
              <h2 className="mt-1.5 text-xl font-bold sm:text-2xl">خرید مطمئن از فروشگاه دشتستان</h2>
              <p className="mt-2 max-w-md text-sm text-white/85">
                تمام محصولات با گارانتی معتبر، ارسال سریع و پشتیبانی تخصصی.
              </p>
            </div>
            <Link
              href="/catalog"
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-[var(--accent)] transition hover:bg-white/95"
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
  let amazingProducts: Awaited<ReturnType<typeof fetchProducts>>["items"] = [];

  try {
    const count = Math.max(config.featured.product_count, 12);
    let pool: Awaited<ReturnType<typeof fetchProducts>>["items"] = [];
    if (config.featured.mode === "manual" && config.featured.product_ids.length) {
      const res = await fetchProducts(undefined, undefined, {
        ids: config.featured.product_ids.slice(0, count),
      });
      pool = res.items;
    } else if (config.featured.mode === "category" && config.featured.category_id != null) {
      const res = await fetchProducts(undefined, undefined, {
        categoryId: config.featured.category_id,
        limit: count,
      });
      pool = res.items;
    } else {
      const res = await fetchProducts(config.featured.parent_slug ?? undefined, undefined, {
        limit: Math.max(count, 24),
      });
      pool = res.items;
    }
    amazingProducts = pool.slice(0, Math.min(10, pool.length));
    featuredProducts = pool.slice(0, config.featured.product_count || 12);
    if (featuredProducts.length < 6 && pool.length) {
      featuredProducts = pool.slice(0, Math.min(12, pool.length));
    }
  } catch {
    featuredProducts = [];
    amazingProducts = [];
  }

  const siteUrl = getSiteUrl(settings);
  const shopName = settings?.shop_name ?? BRAND_NAME;
  const description =
    settings?.default_meta_description ??
    settings?.shop_description ??
    "خرید آنلاین لوازم خانگی و سبک زندگی با گارانتی اصلی.";

  const showCarousel = isSectionEnabled(config, "carousel") && heroBanners.length > 0;
  const showHeroCats = isSectionEnabled(config, "hero");
  const showFeatured = isSectionEnabled(config, "featured");
  const showPromo = isSectionEnabled(config, "promo");

  return (
    <>
      <WebSiteJsonLd siteUrl={siteUrl} name={shopName} description={description} />

      {/* ۱) اسلایدر بنر */}
      {showCarousel ? <HomeBannerCarousel banners={heroBanners} /> : null}

      {/* ۲) اعتماد */}
      <TrustStrip />

      {/* ۳) پیشنهاد شگفت‌انگیز */}
      {showFeatured && amazingProducts.length > 0 ? (
        <AmazingDeals products={amazingProducts} href={config.featured.catalog_href || "/catalog"} />
      ) : null}

      {/* ۴) دسته‌بندی دایره‌ای */}
      {showHeroCats ? <HomeCategoryCircles categories={categories} limit={config.hero.category_limit || 12} /> : null}

      {/* ۵) ریل محصولات */}
      {showFeatured ? (
        <ProductRail
          title={config.featured.title || "پرفروش‌ترین‌ها"}
          subtitle={config.featured.subtitle}
          products={featuredProducts}
          href={config.featured.catalog_href || "/catalog"}
          hrefLabel={config.featured.catalog_label || "مشاهده همه"}
        />
      ) : null}

      {/* ۶) بنرهای تبلیغاتی */}
      {showPromo ? (
        promoBanners.length > 0 ? (
          <>
            {promoBanners.map((banner) => (
              <HomePromoBanner key={banner.id} banner={banner} />
            ))}
          </>
        ) : config.show_promo_fallback ? (
          <DefaultPromoSections />
        ) : null
      ) : null}

      {/* اگر هیچ بنری نبود ولی محصولات هست — CTA پایین */}
      {!showCarousel && !showPromo && featuredProducts.length > 0 ? (
        <section className="shop-container pb-12">
          <Link
            href="/catalog"
            className="flex min-h-12 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-bold text-[var(--accent-fg)] transition hover:opacity-90"
          >
            ورود به فروشگاه
          </Link>
        </section>
      ) : null}
    </>
  );
}

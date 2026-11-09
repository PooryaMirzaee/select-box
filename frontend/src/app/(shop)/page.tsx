import type { Metadata } from "next";

import { WebSiteJsonLd } from "@/components/seo/WebSiteJsonLd";
import { PuckHome } from "@/components/shop/PuckHome";
import {
  fetchBrowse,
  fetchHomeBanners,
  fetchHomepageConfig,
  fetchPageBuilder,
  fetchProducts,
  fetchShopSettings,
} from "@/lib/api";
import { BRAND_NAME, BRAND_TITLE } from "@/lib/brand";
import { DEFAULT_HOMEPAGE_CONFIG } from "@/lib/homepage";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";
import { DEFAULT_HOME_PUCK_DATA } from "@/puck/default-data";
import type { PuckPageData } from "@/puck/types";

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

export default async function HomePage() {
  const [browse, settings, homepage, heroBanners, promoBanners, pageBuilder] = await Promise.all([
    fetchBrowse("").catch(() => null),
    fetchShopSettings().catch(() => null),
    fetchHomepageConfig().catch(() => DEFAULT_HOMEPAGE_CONFIG),
    fetchHomeBanners("hero").catch(() => []),
    fetchHomeBanners("promo").catch(() => []),
    fetchPageBuilder("home").catch(() => null),
  ]);

  const config = {
    ...DEFAULT_HOMEPAGE_CONFIG,
    ...homepage,
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

  let productsLatest: Awaited<ReturnType<typeof fetchProducts>>["items"] = [];
  try {
    const count = Math.max(config.featured.product_count, 24);
    if (config.featured.mode === "manual" && config.featured.product_ids.length) {
      const res = await fetchProducts(undefined, undefined, {
        ids: config.featured.product_ids.slice(0, count),
      });
      productsLatest = res.items;
    } else if (config.featured.mode === "category" && config.featured.category_id != null) {
      const res = await fetchProducts(undefined, undefined, {
        categoryId: config.featured.category_id,
        limit: count,
      });
      productsLatest = res.items;
    } else {
      const res = await fetchProducts(config.featured.parent_slug ?? undefined, undefined, {
        limit: count,
      });
      productsLatest = res.items;
    }
  } catch {
    productsLatest = [];
  }

  const siteUrl = getSiteUrl(settings);
  const shopName = settings?.shop_name ?? BRAND_NAME;
  const description =
    settings?.default_meta_description ??
    settings?.shop_description ??
    "خرید آنلاین لوازم خانگی و سبک زندگی با گارانتی اصلی.";

  const published = pageBuilder?.published !== false;
  const puckData = published
    ? ((pageBuilder?.data as PuckPageData | undefined) ?? null)
    : null;

  return (
    <>
      <WebSiteJsonLd siteUrl={siteUrl} name={shopName} description={description} />
      <PuckHome
        data={puckData ?? DEFAULT_HOME_PUCK_DATA}
        useFallbackWhenEmpty={!pageBuilder || !published}
        metadata={{
          heroBanners,
          promoBanners,
          categories: browse?.children ?? [],
          productsLatest,
          productsAmazing: productsLatest.slice(0, 10),
        }}
      />
    </>
  );
}

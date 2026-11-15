import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PuckHome } from "@/components/shop/PuckHome";
import {
  fetchBrowse,
  fetchHomeBanners,
  fetchHomepageConfig,
  fetchPageBuilder,
  fetchProducts,
  fetchShopSettings,
} from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { DEFAULT_HOMEPAGE_CONFIG } from "@/lib/homepage";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";
import type { PuckPageData } from "@/puck/types";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!slug || slug === "home") {
    return {};
  }
  const [settings, page] = await Promise.all([
    fetchShopSettings().catch(() => null),
    fetchPageBuilder(slug).catch(() => null),
  ]);
  if (!page?.published) {
    return { title: "صفحه پیدا نشد" };
  }
  const root = (page.data as PuckPageData | undefined)?.root?.props as
    | { seoTitle?: string; seoDescription?: string; title?: string }
    | undefined;
  const shopName = settings?.shop_name ?? BRAND_NAME;
  const title = root?.seoTitle || root?.title || slug;
  const description = root?.seoDescription || settings?.default_meta_description || undefined;
  return buildPageMetadata({
    title,
    description,
    canonical: `${getSiteUrl(settings)}/p/${slug}`,
    shopName,
  });
}

export default async function CustomPuckPage({ params }: Props) {
  const { slug } = await params;
  if (!slug || slug === "home") notFound();

  const [browse, homepage, heroBanners, promoBanners, pageBuilder] = await Promise.all([
    fetchBrowse("").catch(() => null),
    fetchHomepageConfig().catch(() => DEFAULT_HOMEPAGE_CONFIG),
    fetchHomeBanners("hero").catch(() => []),
    fetchHomeBanners("promo").catch(() => []),
    fetchPageBuilder(slug).catch(() => null),
  ]);

  if (!pageBuilder || pageBuilder.published === false) {
    notFound();
  }

  const content = (pageBuilder.data as PuckPageData | undefined)?.content;
  if (!content?.length && !(pageBuilder.data as PuckPageData | undefined)?.root) {
    notFound();
  }

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
    const res = await fetchProducts(config.featured.parent_slug ?? undefined, undefined, {
      limit: Math.max(config.featured.product_count, 24),
    });
    productsLatest = res.items;
  } catch {
    productsLatest = [];
  }

  return (
    <PuckHome
      slug={slug}
      data={(pageBuilder.data as PuckPageData) || null}
      useFallbackWhenEmpty={false}
      metadata={{
        heroBanners,
        promoBanners,
        categories: browse?.children ?? [],
        productsLatest,
        productsAmazing: productsLatest.slice(0, 10),
      }}
    />
  );
}

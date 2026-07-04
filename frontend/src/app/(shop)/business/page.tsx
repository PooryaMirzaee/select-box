import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BusinessLandingView } from "@/components/business/BusinessLandingView";
import { fetchBusinessHub, fetchProducts, fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const [hub, settings] = await Promise.all([
    fetchBusinessHub().catch(() => null),
    fetchShopSettings().catch(() => null),
  ]);
  const siteUrl = getSiteUrl(settings);
  const title = hub?.hub.meta_title ?? `سفارش عمده — ${BRAND_NAME}`;
  const description =
    hub?.hub.meta_description ?? "تأمین لوازم خانگی برای پروژه‌ها، سازمان‌ها و ساختمان‌ها.";

  const shopName = settings?.shop_name ?? BRAND_NAME;

  return buildPageMetadata({
    title,
    description,
    canonical: `${siteUrl}/business`,
    shopName,
  });
}

export default async function BusinessHubPage() {
  const [data, products] = await Promise.all([
    fetchBusinessHub().catch(() => null),
    fetchProducts().catch(() => []),
  ]);
  if (!data) notFound();

  return (
    <BusinessLandingView
      landing={data.hub}
      productLandings={data.product_landings}
      productType="hub"
      showProductCards
      catalogSamples={products}
    />
  );
}

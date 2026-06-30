import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BusinessLandingView } from "@/components/business/BusinessLandingView";
import { ArrowLeft } from "@/components/icons";
import { fetchBusinessLanding, fetchProducts, fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";

export const revalidate = 60;

const VALID_TYPES = new Set(["tshirt", "hoodie", "mug"]);

type Props = { params: Promise<{ type: string }> };

export async function generateStaticParams() {
  return [{ type: "tshirt" }, { type: "hoodie" }, { type: "mug" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  if (!VALID_TYPES.has(type)) return {};
  const [landing, settings] = await Promise.all([
    fetchBusinessLanding(type).catch(() => null),
    fetchShopSettings().catch(() => null),
  ]);
  if (!landing) return {};
  const siteUrl = getSiteUrl(settings);
  const title = landing.meta_title ?? landing.title;
  const description = landing.meta_description ?? landing.subtitle ?? "";

  const shopName = settings?.shop_name ?? BRAND_NAME;

  return buildPageMetadata({
    title,
    description,
    canonical: `${siteUrl}/business/${type}`,
    shopName,
  });
}

export default async function BusinessProductPage({ params }: Props) {
  const { type } = await params;
  if (!VALID_TYPES.has(type)) notFound();

  const [landing, products] = await Promise.all([
    fetchBusinessLanding(type).catch(() => null),
    fetchProducts(type).catch(() => []),
  ]);
  if (!landing) notFound();

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        <Link
          href="/business"
          className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-[var(--fg)]"
        >
          <ArrowLeft className="h-4 w-4" />
          بازگشت به سفارش سازمانی
        </Link>
      </div>
      <BusinessLandingView landing={landing} productType={type} catalogSamples={products} />
    </>
  );
}

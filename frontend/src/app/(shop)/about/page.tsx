import type { Metadata } from "next";

import { LegalArticle } from "@/components/shop/LegalArticle";
import { fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchShopSettings().catch(() => null);
  const shopName = settings?.shop_name ?? BRAND_NAME;
  return buildPageMetadata({
    title: `درباره ${shopName}`,
    description: settings?.shop_description,
    canonical: `${getSiteUrl(settings)}/about`,
    shopName,
  });
}

export default async function AboutPage() {
  const settings = await fetchShopSettings().catch(() => null);
  const shopName = settings?.shop_name ?? BRAND_NAME;
  return (
    <LegalArticle title={`درباره ${shopName}`}>
      <p>
        {settings?.shop_description ||
          `${shopName} فروشگاه آنلاین لوازم خانگی، سبک زندگی و وسایل روزمره با گارانتی اصلی است.`}
      </p>
      {settings?.contact_address ? <p>نشانی: {settings.contact_address}</p> : null}
      {settings?.contact_hours ? <p>ساعات پاسخگویی: {settings.contact_hours}</p> : null}
      {settings?.legal_company_name ? <p>نام حقوقی: {settings.legal_company_name}</p> : null}
    </LegalArticle>
  );
}

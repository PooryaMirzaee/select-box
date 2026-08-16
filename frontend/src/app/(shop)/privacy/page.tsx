import type { Metadata } from "next";

import { LegalArticle } from "@/components/shop/LegalArticle";
import { fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchShopSettings().catch(() => null);
  const shopName = settings?.shop_name ?? BRAND_NAME;
  return buildPageMetadata({
    title: "حریم خصوصی",
    description: `نحوه نگهداری اطلاعات در ${shopName}`,
    canonical: `${getSiteUrl(settings)}/privacy`,
    shopName,
  });
}

export default async function PrivacyPage() {
  const settings = await fetchShopSettings().catch(() => null);
  const shopName = settings?.shop_name ?? BRAND_NAME;
  return (
    <LegalArticle title="حریم خصوصی">
      <p>
        {shopName} اطلاعات تماس و آدرس ارسال را فقط برای پردازش سفارش، پشتیبانی و الزامات قانونی نگه
        می‌دارد.
      </p>
      <h2>چه داده‌ای جمع می‌شود</h2>
      <p>نام، شماره موبایل، آدرس، سوابق سفارش و در صورت ورود، حساب کاربری.</p>
      <h2>اشتراک‌گذاری</h2>
      <p>اطلاعات با شرکت حمل برای ارسال مرسوله به اشتراک گذاشته می‌شود و به اشخاص ثالث فروخته نمی‌شود.</p>
    </LegalArticle>
  );
}

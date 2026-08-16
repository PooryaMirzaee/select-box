import type { Metadata } from "next";

import { LegalArticle } from "@/components/shop/LegalArticle";
import { fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchShopSettings().catch(() => null);
  const shopName = settings?.shop_name ?? BRAND_NAME;
  return buildPageMetadata({
    title: "قوانین و شرایط استفاده",
    description: `شرایط خرید از ${shopName}`,
    canonical: `${getSiteUrl(settings)}/terms`,
    shopName,
  });
}

export default async function TermsPage() {
  const settings = await fetchShopSettings().catch(() => null);
  const shopName = settings?.shop_name ?? BRAND_NAME;
  return (
    <LegalArticle title="قوانین و شرایط استفاده">
      <p>خرید از {shopName} به معنای پذیرش این شرایط است.</p>
      <h2>ثبت سفارش</h2>
      <p>
        سفارش پس از ثبت، تا زمان تأیید پرداخت «در انتظار پرداخت» است. موجودی کالا در لحظه ثبت رزرو
        می‌شود. در صورت لغو یا عدم پرداخت، موجودی آزاد می‌گردد.
      </p>
      <h2>قیمت و موجودی</h2>
      <p>قیمت نمایش‌داده‌شده در صفحه محصول مبنای فاکتور است. هزینه ارسال جداگانه محاسبه می‌شود.</p>
      <h2>ارسال</h2>
      <p>پس از آماده‌سازی، کد رهگیری پستی در صفحه پیگیری سفارش نمایش داده می‌شود.</p>
    </LegalArticle>
  );
}

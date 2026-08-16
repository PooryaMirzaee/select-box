import type { Metadata } from "next";

import { LegalArticle } from "@/components/shop/LegalArticle";
import { fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchShopSettings().catch(() => null);
  const shopName = settings?.shop_name ?? BRAND_NAME;
  return buildPageMetadata({
    title: "بازگشت کالا",
    description: `شرایط مرجوعی در ${shopName}`,
    canonical: `${getSiteUrl(settings)}/returns`,
    shopName,
  });
}

export default async function ReturnsPage() {
  const settings = await fetchShopSettings().catch(() => null);
  const days = settings?.return_days ?? 7;
  const shopName = settings?.shop_name ?? BRAND_NAME;
  return (
    <LegalArticle title="شرایط بازگشت کالا">
      <p>
        در {shopName} تا {days.toLocaleString("fa-IR")} روز پس از تحویل، در صورت سالم‌بودن کالا و حفظ
        بسته‌بندی، امکان مرجوعی وجود دارد.
      </p>
      <h2>موارد غیرقابل بازگشت</h2>
      <p>کالاهای بهداشتی بازشده، اقلام سفارشی و کالاهایی که به دلیل استفاده مشتری آسیب دیده باشند.</p>
      <h2>نحوه درخواست</h2>
      <p>
        از طریق صفحه تماس یا چت پشتیبانی، کد رهگیری سفارش را ارسال کنید تا وضعیت مرجوعی بررسی شود.
      </p>
    </LegalArticle>
  );
}

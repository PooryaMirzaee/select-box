import type { Metadata } from "next";
import Link from "next/link";

import { LegalArticle } from "@/components/shop/LegalArticle";
import { fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchShopSettings().catch(() => null);
  const shopName = settings?.shop_name ?? BRAND_NAME;
  return buildPageMetadata({
    title: "تماس با ما",
    description: `راه‌های ارتباط با ${shopName}`,
    canonical: `${getSiteUrl(settings)}/contact`,
    shopName,
  });
}

export default async function ContactPage() {
  const settings = await fetchShopSettings().catch(() => null);
  const shopName = settings?.shop_name ?? BRAND_NAME;
  return (
    <LegalArticle title="تماس با ما">
      <p>برای پیگیری سفارش، مرجوعی یا همکاری با {shopName} از راه‌های زیر استفاده کنید.</p>
      {settings?.contact_phone ? (
        <p>
          تلفن:{" "}
          <a href={`tel:${settings.contact_phone}`} dir="ltr">
            {settings.contact_phone}
          </a>
        </p>
      ) : null}
      {settings?.contact_email ? (
        <p>
          ایمیل:{" "}
          <a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>
        </p>
      ) : null}
      {settings?.contact_address ? <p>نشانی: {settings.contact_address}</p> : null}
      {settings?.contact_hours ? <p>ساعات پاسخگویی: {settings.contact_hours}</p> : null}
      <p>
        پیگیری سفارش بدون ورود: <Link href="/orders">وارد کردن کد رهگیری</Link>
      </p>
    </LegalArticle>
  );
}

import type { Metadata } from "next";

import type { ShopSettings } from "@/lib/api";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { getSearchVerification, getSiteUrl } from "@/lib/seo";

/** متای پیش‌فرض از تنظیمات فروشگاه */
export function rootMetadataFromSettings(settings: ShopSettings | null): Metadata {
  const siteUrl = getSiteUrl(settings);
  const shopName = settings?.shop_name ?? BRAND_NAME;
  const title = settings?.default_meta_title ?? `${shopName} — ${BRAND_TAGLINE}`;
  const description =
    settings?.default_meta_description ??
    settings?.shop_description ??
    "خرید آنلاین لوازم خانگی — یخچال، ماشین لباسشویی، جاروبرقی و بیشتر با گارانتی و ارسال سریع.";

  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s | ${shopName}` },
    description,
    applicationName: shopName,
    category: "shopping",
    icons: {
      icon: "/brand/selectbox-logo.png",
      apple: "/brand/selectbox-logo.png",
    },
    manifest: "/manifest.webmanifest",
    keywords: [
      "لوازم خانگی",
      "یخچال",
      "ماشین لباسشویی",
      "جاروبرقی",
      "ظرفشویی",
      "کولر گازی",
      "تلویزیون",
      "فروشگاه آنلاین",
      "selectbox",
      shopName,
    ],
    authors: [{ name: shopName, url: siteUrl }],
    creator: shopName,
    publisher: shopName,
    formatDetection: { telephone: true, email: true, address: true },
    openGraph: {
      type: "website",
      locale: "fa_IR",
      siteName: shopName,
      url: siteUrl,
      title,
      description,
      images: [{ url: "/brand/selectbox-logo.png", alt: shopName, width: 512, height: 512 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/brand/selectbox-logo.png"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    alternates: {
      canonical: siteUrl,
      languages: { "fa-IR": siteUrl },
      types: {
        "application/rss+xml": `${siteUrl}/blog/rss.xml`,
      },
    },
    verification: getSearchVerification(),
  };
}

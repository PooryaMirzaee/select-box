import type { Metadata } from "next";

import type { ShopSettings } from "@/lib/api";
import { pickContactInfo } from "@/lib/contact";
import { instagramHref, telegramHref } from "@/lib/contact";

/** مبدأ سایت — اولویت: تنظیمات ادمین، سپس env */
export function getSiteUrl(settings?: Pick<ShopSettings, "site_url"> | null): string {
  const raw = (settings?.site_url?.trim() || process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  if (/^https?:\/\//i.test(raw)) return raw;
  // دامنهٔ خام (مثلاً shop.example.com) — برای جلوگیری از crash در new URL()
  return `https://${raw.replace(/^\/+/, "")}`;
}

export function browseCanonical(siteUrl: string, pathStr: string): string {
  return pathStr ? `${siteUrl}/browse/${pathStr}` : `${siteUrl}/browse`;
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  tshirt: "تیشرت",
  hoodie: "هودی",
  mug: "ماگ",
};

export function productTypeLabel(slug: string | undefined): string | null {
  if (!slug) return null;
  return PRODUCT_TYPE_LABELS[slug] ?? slug;
}

export function appendTypeToTitle(base: string, productType?: string): string {
  const label = productTypeLabel(productType);
  return label ? `${label} — ${base}` : base;
}

export function absoluteUrl(siteUrl: string, path: string): string {
  if (path.startsWith("http")) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/** لینک‌های شبکه‌های اجتماعی برای sameAs در schema.org */
export function socialSameAs(settings?: ShopSettings | null): string[] {
  if (!settings) return [];
  const contact = pickContactInfo(settings);
  const links: string[] = [];
  const ig = instagramHref(contact.contact_instagram);
  if (ig) links.push(ig);
  const tg = telegramHref(contact.contact_telegram);
  if (tg) links.push(tg);
  return links;
}

/** کدهای تأیید مالکیت از env */
export function getSearchVerification(): Metadata["verification"] {
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const bing = process.env.BING_SITE_VERIFICATION?.trim();
  const yandex = process.env.YANDEX_SITE_VERIFICATION?.trim();
  if (!google && !bing && !yandex) return undefined;
  return {
    ...(google ? { google } : {}),
    ...(bing ? { other: { "msvalidate.01": bing } } : {}),
    ...(yandex ? { yandex } : {}),
  };
}

export type PageMetaInput = {
  title: string;
  description?: string;
  canonical: string;
  shopName: string;
  ogType?: "website" | "article";
  ogImage?: string | null;
  ogImageAlt?: string;
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  noindex?: boolean;
};

/** ساخت متای یکپارچه برای صفحات فروشگاه */
export function buildPageMetadata(input: PageMetaInput): Metadata {
  const {
    title,
    description,
    canonical,
    shopName,
    ogType = "website",
    ogImage,
    ogImageAlt,
    publishedTime,
    modifiedTime,
    authors,
    noindex,
  } = input;

  const ogImages = ogImage ? [{ url: ogImage, ...(ogImageAlt ? { alt: ogImageAlt } : {}) }] : undefined;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { "fa-IR": canonical },
    },
    openGraph: {
      type: ogType,
      locale: "fa_IR",
      siteName: shopName,
      title,
      description,
      url: canonical,
      ...(ogImages ? { images: ogImages } : {}),
      ...(ogType === "article" && publishedTime ? { publishedTime } : {}),
      ...(ogType === "article" && modifiedTime ? { modifiedTime } : {}),
      ...(ogType === "article" && authors?.length ? { authors } : {}),
    },
    twitter: {
      card: ogImages ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImages ? { images: [ogImage!] } : {}),
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

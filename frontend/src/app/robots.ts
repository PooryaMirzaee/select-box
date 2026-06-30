/**
 * robots.txt تولیدشده — مسیرهای خصوصی و ادمین برای ایندکس بسته است.
 */

import type { MetadataRoute } from "next";

import { fetchShopSettings } from "@/lib/api";
import { getSiteUrl } from "@/lib/seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await fetchShopSettings().catch(() => null);
  const siteUrl = getSiteUrl(settings);

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/account",
          "/cart",
          "/checkout",
          "/login",
          "/customize/",
          "/creator/",
          "/orders/",
          "/maintenance",
          "/unauthorized",
          "/forbidden",
          "/api/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

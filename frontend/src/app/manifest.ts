import type { MetadataRoute } from "next";

import { fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { getSiteUrl } from "@/lib/seo";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await fetchShopSettings().catch(() => null);
  const shopName = settings?.shop_name ?? BRAND_NAME;
  const description =
    settings?.shop_description ??
    settings?.default_meta_description ??
    "تیشرت و هودی طرح‌محور با چاپ باکیفیت.";

  return {
    name: shopName,
    short_name: shopName.slice(0, 12),
    description,
    start_url: "/",
    display: "standalone",
    background_color: "#f2ece4",
    theme_color: "#c45c26",
    lang: "fa",
    dir: "rtl",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/brand/coralay-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/coralay-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["shopping", "lifestyle"],
  };
}

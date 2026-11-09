import type { Data } from "@puckeditor/core";

import type { HomeBanner } from "@/lib/home-banners";
import type { ProductSummary } from "@/lib/api";
import type { CategoryCardItem } from "@/components/shop/CategoryCard";

export type ProductSource = "latest" | "amazing";

export type PuckComponents = {
  HeroCarousel: {
    autoplay: boolean;
    intervalMs: number;
  };
  TrustStrip: {
    /** فقط برای سازگاری تایپ — بدون فیلد قابل‌ویرایش */
    _noop?: boolean;
  };
  AmazingDeals: {
    title: string;
    href: string;
    productCount: number;
    source: ProductSource;
  };
  CategoryCircles: {
    title: string;
    limit: number;
    href: string;
  };
  ProductRail: {
    title: string;
    subtitle: string;
    href: string;
    hrefLabel: string;
    productCount: number;
    source: ProductSource;
  };
  PromoBanners: {
    showFallback: boolean;
  };
  PromoCard: {
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaHref: string;
    style: "card" | "gradient";
  };
  Heading: {
    text: string;
    level: "h1" | "h2" | "h3";
    align: "start" | "center";
  };
  Text: {
    text: string;
    align: "start" | "center";
  };
  Spacer: {
    size: "sm" | "md" | "lg" | "xl";
  };
  ImageBanner: {
    imageUrl: string;
    href: string;
    alt: string;
    height: "sm" | "md" | "lg";
    rounded: boolean;
  };
  CtaButton: {
    label: string;
    href: string;
    variant: "primary" | "outline";
    fullWidth: boolean;
  };
  TwoColumns: {
    gap: "sm" | "md" | "lg";
  };
};

export type PuckRootProps = {
  title: string;
  paddingY: "none" | "sm" | "md";
};

export type PuckPageData = Data<PuckComponents, PuckRootProps>;

export type PuckMetadata = {
  heroBanners: HomeBanner[];
  promoBanners: HomeBanner[];
  categories: CategoryCardItem[];
  productsLatest: ProductSummary[];
  productsAmazing: ProductSummary[];
  editing?: boolean;
};

export type PageBuilderPublic = {
  slug: string;
  data: PuckPageData;
  published: boolean;
  appearance: import("./appearance").ThemeAppearance;
};

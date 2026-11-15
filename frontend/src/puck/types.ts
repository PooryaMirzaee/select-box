import type { Data, Slot } from "@puckeditor/core";

import type { HomeBanner } from "@/lib/home-banners";
import type { ProductSummary } from "@/lib/api";
import type { CategoryCardItem } from "@/components/shop/CategoryCard";
import type { ChromeProps } from "./style/types";

export type ProductSource = "latest" | "amazing";
export type SourceMode = "live" | "manual";

type C = ChromeProps;

export type TrustItem = { title: string; desc: string; icon?: string };
export type FaqItem = { question: string; answer: string };
export type FeatureItem = { title: string; desc: string; icon?: string };
export type ManualSlide = { imageUrl: string; href: string; title: string; subtitle?: string };
export type ManualProduct = { title: string; price: string; imageUrl: string; href: string };
export type ManualCategory = { title: string; imageUrl: string; href: string };
export type BrandItem = { name: string; imageUrl: string; href?: string };
export type ButtonItem = { label: string; href: string; variant: "primary" | "outline" };

export type PuckComponents = {
  HeroCarousel: C & {
    sourceMode: SourceMode;
    autoplay: boolean;
    intervalMs: number;
    slides: ManualSlide[];
  };
  TrustStrip: C & {
    items: TrustItem[];
  };
  AmazingDeals: C & {
    sourceMode: SourceMode;
    title: string;
    href: string;
    productCount: number;
    source: ProductSource;
    manualProducts: ManualProduct[];
  };
  CategoryCircles: C & {
    sourceMode: SourceMode;
    title: string;
    limit: number;
    href: string;
    manualCategories: ManualCategory[];
  };
  ProductRail: C & {
    sourceMode: SourceMode;
    title: string;
    subtitle: string;
    href: string;
    hrefLabel: string;
    productCount: number;
    source: ProductSource;
    manualProducts: ManualProduct[];
  };
  ProductGrid: C & {
    sourceMode: SourceMode;
    title: string;
    href: string;
    hrefLabel: string;
    productCount: number;
    source: ProductSource;
    columns: "2" | "3" | "4";
    manualProducts: ManualProduct[];
  };
  PromoBanners: C & {
    sourceMode: SourceMode;
    showFallback: boolean;
  };
  PromoCard: C & {
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaHref: string;
    cardStyle: "card" | "gradient";
  };
  FaqList: C & {
    title: string;
    items: FaqItem[];
  };
  FeaturesGrid: C & {
    title: string;
    columns: "2" | "3" | "4";
    items: FeatureItem[];
  };
  BrandLogos: C & {
    title: string;
    items: BrandItem[];
  };
  NewsletterCta: C & {
    title: string;
    subtitle: string;
    placeholder: string;
    buttonLabel: string;
    note: string;
  };
  CountdownDeal: C & {
    title: string;
    subtitle: string;
    endsAt: string;
    ctaLabel: string;
    ctaHref: string;
  };
  Section: C & {
    content: Slot;
  };
  Container: C & {
    content: Slot;
  };
  Columns: C & {
    columns: "2" | "3" | "4";
    colGap: "sm" | "md" | "lg";
    col1: Slot;
    col2: Slot;
    col3: Slot;
    col4: Slot;
  };
  Stack: C & {
    content: Slot;
    stackGap: "sm" | "md" | "lg";
  };
  Spacer: C & {
    size: "sm" | "md" | "lg" | "xl";
    customHeight: string;
  };
  Divider: C & {
    thickness: string;
    color: string;
  };
  Heading: C & {
    text: string;
    level: "h1" | "h2" | "h3";
  };
  Paragraph: C & {
    text: string;
  };
  Text: C & {
    text: string;
  };
  RichText: C & {
    text: string;
  };
  BulletList: C & {
    items: { text: string }[];
  };
  Image: C & {
    imageUrl: string;
    alt: string;
    href: string;
    objectFit: "cover" | "contain";
  };
  ImageBanner: C & {
    imageUrl: string;
    href: string;
    alt: string;
    height: "sm" | "md" | "lg";
    rounded: boolean;
  };
  VideoEmbed: C & {
    url: string;
    title: string;
    aspect: "16:9" | "4:3" | "1:1";
  };
  Icon: C & {
    name: string;
    size: string;
  };
  CtaButton: C & {
    label: string;
    href: string;
    variant: "primary" | "outline";
    fullWidth: boolean;
  };
  ButtonGroup: C & {
    buttons: ButtonItem[];
    align: "start" | "center" | "end";
  };
  Badge: C & {
    label: string;
    tone: "accent" | "muted" | "hot";
  };
  Quote: C & {
    text: string;
    cite: string;
  };
  HtmlEmbed: C & {
    html: string;
  };
  TwoColumns: C & {
    colGap: "sm" | "md" | "lg";
  };
};

export type PuckRootProps = {
  title: string;
  paddingY: "none" | "sm" | "md";
  pageBg: string;
  pageCustomCss: string;
  seoTitle: string;
  seoDescription: string;
  schemaVersion: number;
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
  title?: string;
  data: PuckPageData;
  published: boolean;
  appearance: import("./appearance").ThemeAppearance;
};

export type PageBuilderListItem = {
  slug: string;
  title: string;
  published: boolean;
};

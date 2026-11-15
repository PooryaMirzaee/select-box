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
export type StatItem = { value: string; label: string; suffix?: string };
export type TestimonialItem = {
  name: string;
  role: string;
  text: string;
  rating: number;
  avatarUrl?: string;
};
export type PricingItem = {
  name: string;
  price: string;
  period: string;
  features: string;
  ctaLabel: string;
  ctaHref: string;
  highlighted: boolean;
};
export type StepItem = { title: string; desc: string };
export type AccordionItem = { title: string; body: string };
export type SocialItem = { label: string; href: string; icon?: string };
export type GalleryItem = { imageUrl: string; alt: string; href?: string };
export type LinkItem = { label: string; href: string };
export type TableRow = { cells: string };

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
  AnnouncementBar: C & {
    text: string;
    href: string;
    hrefLabel: string;
    dismissible: boolean;
  };
  HeroBanner: C & {
    eyebrow: string;
    title: string;
    subtitle: string;
    imageUrl: string;
    ctaLabel: string;
    ctaHref: string;
    secondaryLabel: string;
    secondaryHref: string;
    minHeight: string;
    overlay: string;
  };
  StatsRow: C & {
    title: string;
    items: StatItem[];
  };
  Testimonials: C & {
    title: string;
    columns: "1" | "2" | "3";
    items: TestimonialItem[];
  };
  PricingCards: C & {
    title: string;
    items: PricingItem[];
  };
  StepsProcess: C & {
    title: string;
    items: StepItem[];
  };
  Accordion: C & {
    title: string;
    items: AccordionItem[];
  };
  MapEmbed: C & {
    embedUrl: string;
    title: string;
    height: string;
  };
  SocialLinks: C & {
    title: string;
    items: SocialItem[];
  };
  ContactInfo: C & {
    title: string;
    phone: string;
    mobile: string;
    email: string;
    address: string;
    hours: string;
  };
  Gallery: C & {
    title: string;
    columns: "2" | "3" | "4";
    items: GalleryItem[];
  };
  Callout: C & {
    title: string;
    body: string;
    tone: "info" | "success" | "warning" | "accent";
  };
  LinkList: C & {
    title: string;
    items: LinkItem[];
  };
  Marquee: C & {
    text: string;
    speed: "slow" | "normal" | "fast";
  };
  OrderedList: C & {
    items: { text: string }[];
  };
  DataTable: C & {
    title: string;
    headers: string;
    rows: TableRow[];
  };
  Card: C & {
    content: Slot;
  };
  Grid: C & {
    columns: "2" | "3" | "4";
    colGap: "sm" | "md" | "lg";
    cell1: Slot;
    cell2: Slot;
    cell3: Slot;
    cell4: Slot;
  };
  CustomCode: C & {
    html: string;
    css: string;
  };
  StickyCta: C & {
    text: string;
    buttonLabel: string;
    buttonHref: string;
    position: "top" | "bottom";
  };
  LogoLockup: C & {
    imageUrl: string;
    brandName: string;
    tagline: string;
    href: string;
    logoHeight: string;
  };
  SearchCta: C & {
    title: string;
    placeholder: string;
    buttonLabel: string;
    href: string;
  };
  CategoryCards: C & {
    sourceMode: SourceMode;
    title: string;
    limit: number;
    columns: "2" | "3" | "4";
    manualCategories: ManualCategory[];
  };
  SeparatorLabel: C & {
    label: string;
    lineColor: string;
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

import { SCHEMA_VERSION } from "./style";
import type { PuckPageData } from "./types";

export const DEFAULT_HOME_PUCK_DATA = {
  root: {
    props: {
      title: "صفحه اصلی",
      paddingY: "none",
      pageBg: "",
      pageCustomCss: "",
      seoTitle: "",
      seoDescription: "",
      schemaVersion: SCHEMA_VERSION,
    },
  },
  content: [
    {
      type: "HeroCarousel",
      props: {
        id: "HeroCarousel-1",
        sourceMode: "live",
        autoplay: true,
        intervalMs: 5000,
        slides: [],
      },
    },
    {
      type: "TrustStrip",
      props: {
        id: "TrustStrip-1",
        items: [
          { title: "ارسال سریع", desc: "به سراسر کشور", icon: "truck" },
          { title: "ضمانت اصالت", desc: "کالای اورجینال", icon: "shield" },
          { title: "پرداخت امن", desc: "درگاه معتبر", icon: "card" },
          { title: "پشتیبانی", desc: "پاسخگویی سریع", icon: "headset" },
        ],
      },
    },
    {
      type: "AmazingDeals",
      props: {
        id: "AmazingDeals-1",
        sourceMode: "live",
        title: "پیشنهاد شگفت‌انگیز",
        href: "/catalog",
        productCount: 10,
        source: "amazing",
        manualProducts: [],
      },
    },
    {
      type: "CategoryCircles",
      props: {
        id: "CategoryCircles-1",
        sourceMode: "live",
        title: "دسته‌بندی‌ها",
        limit: 12,
        href: "/browse",
        manualCategories: [],
      },
    },
    {
      type: "ProductRail",
      props: {
        id: "ProductRail-1",
        sourceMode: "live",
        title: "پرفروش‌ترین‌ها",
        subtitle: "محصولات منتخب",
        href: "/catalog",
        hrefLabel: "مشاهده همه",
        productCount: 12,
        source: "latest",
        manualProducts: [],
      },
    },
    {
      type: "PromoBanners",
      props: {
        id: "PromoBanners-1",
        sourceMode: "live",
        showFallback: true,
      },
    },
  ],
} as PuckPageData;

export function emptyPageData(title: string): PuckPageData {
  return ({
    root: {
      props: {
        title,
        paddingY: "sm",
        pageBg: "",
        pageCustomCss: "",
        seoTitle: title,
        seoDescription: "",
        schemaVersion: SCHEMA_VERSION,
      },
    },
    content: [
      {
        type: "Heading",
        props: {
          id: "Heading-1",
          text: title,
          level: "h1",
        },
      },
      {
        type: "Paragraph",
        props: {
          id: "Paragraph-1",
          text: "محتوای این صفحه را از ادیتور ویرایش کنید.",
        },
      },
    ],
  }) as PuckPageData;
}

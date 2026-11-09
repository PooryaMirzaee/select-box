import type { PuckPageData } from "./types";

export const DEFAULT_HOME_PUCK_DATA: PuckPageData = {
  root: {
    props: {
      title: "صفحه اصلی",
      paddingY: "none",
    },
  },
  content: [
    {
      type: "HeroCarousel",
      props: { id: "HeroCarousel-1", autoplay: true, intervalMs: 5000 },
    },
    {
      type: "TrustStrip",
      props: { id: "TrustStrip-1", _noop: false },
    },
    {
      type: "AmazingDeals",
      props: {
        id: "AmazingDeals-1",
        title: "پیشنهاد شگفت‌انگیز",
        href: "/catalog",
        productCount: 10,
        source: "amazing",
      },
    },
    {
      type: "CategoryCircles",
      props: {
        id: "CategoryCircles-1",
        title: "دسته‌بندی‌ها",
        limit: 12,
        href: "/browse",
      },
    },
    {
      type: "ProductRail",
      props: {
        id: "ProductRail-1",
        title: "پرفروش‌ترین‌ها",
        subtitle: "محصولات منتخب",
        href: "/catalog",
        hrefLabel: "مشاهده همه",
        productCount: 12,
        source: "latest",
      },
    },
    {
      type: "PromoBanners",
      props: { id: "PromoBanners-1", showFallback: true },
    },
  ],
};

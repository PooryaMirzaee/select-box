export type HomepageCta = {
  label: string;
  href: string;
};

export type HomepageHeroConfig = {
  badge: string;
  title: string;
  subtitle: string;
  primary_cta: HomepageCta;
  secondary_cta: HomepageCta;
  mobile_categories_cta: HomepageCta;
  categories_link_label: string;
  categories_link_href: string;
  show_categories_bento: boolean;
  category_limit: number;
};

export type HomepageFeaturedConfig = {
  title: string;
  subtitle: string;
  catalog_label: string;
  catalog_href: string;
  product_count: number;
  parent_slug: string | null;
};

export type HomepageSection = {
  id: string;
  enabled: boolean;
};

export type HomepageConfig = {
  sections: HomepageSection[];
  hero: HomepageHeroConfig;
  featured: HomepageFeaturedConfig;
  show_promo_fallback: boolean;
};

export type HomepageAdminBundle = HomepageConfig & {
  banners_hero: import("@/lib/home-banners").HomeBannerAdmin[];
  banners_promo: import("@/lib/home-banners").HomeBannerAdmin[];
};

export const HOMEPAGE_SECTION_META: Record<
  string,
  { label: string; description: string; hint?: string }
> = {
  carousel: {
    label: "اسلایدر بنر",
    description: "بالای صفحه — تصاویر تمام‌عرض",
    hint: "حداقل یک بنر با محل «اسلایدر» اضافه کنید",
  },
  hero: {
    label: "معرفی و دسته‌ها",
    description: "عنوان، دکمه‌ها و شبکهٔ دسته‌بندی",
    hint: "دسته‌ها از بخش «دسته‌ها» در ادمین مدیریت می‌شوند",
  },
  featured: {
    label: "محصولات منتخب",
    description: "گرید محصولات پرفروش یا جدید",
  },
  promo: {
    label: "بنرهای تبلیغاتی",
    description: "کارت‌ها یا تصاویر پایین صفحه",
    hint: "اگر بنری نباشد، می‌توانید بخش‌های پیش‌فرض را فعال کنید",
  },
};

export const DEFAULT_HOMEPAGE_CONFIG: HomepageConfig = {
  sections: [
    { id: "carousel", enabled: true },
    { id: "hero", enabled: true },
    { id: "featured", enabled: true },
    { id: "promo", enabled: true },
  ],
  hero: {
    badge: "فروشگاه طرح‌محور",
    title: "دنیای خودت رو انتخاب کن",
    subtitle: "تیشرت و هودی با موضوع دلخواه — یا با Design Lab اثر خودت را بساز و سفارش بده.",
    primary_cta: { label: "شروع Design Lab", href: "/customize" },
    secondary_cta: { label: "ویترین خالقین", href: "/studios" },
    mobile_categories_cta: { label: "مرور دسته‌ها", href: "/browse" },
    categories_link_label: "همه دسته‌ها",
    categories_link_href: "/browse",
    show_categories_bento: true,
    category_limit: 6,
  },
  featured: {
    title: "منتخب",
    subtitle: "طرح‌های تازه",
    catalog_label: "کاتالوگ ←",
    catalog_href: "/catalog",
    product_count: 6,
    parent_slug: null,
  },
  show_promo_fallback: true,
};

export function isSectionEnabled(config: HomepageConfig, id: string) {
  return config.sections.find((s) => s.id === id)?.enabled ?? true;
}

export type HomeBanner = {
  id: number;
  title_fa: string | null;
  subtitle_fa: string | null;
  eyebrow_fa: string | null;
  cta_label: string | null;
  cta_href: string | null;
  image_url: string | null;
  image_mobile_url: string | null;
  placement: "hero" | "promo";
  variant: "image" | "text";
  text_align: "start" | "center";
  overlay_opacity: number;
  accent_style: "default" | "primary";
  sort_order: number;
  open_in_new_tab: boolean;
};

export type HomeBannerAdmin = HomeBanner & {
  image_key: string | null;
  image_mobile_key: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export const BANNER_PLACEMENTS = [
  { value: "hero", label: "اسلایدر بالای صفحه" },
  { value: "promo", label: "بنر میان صفحه" },
] as const;

export const BANNER_VARIANTS = [
  { value: "image", label: "تصویری" },
  { value: "text", label: "متنی (بدون تصویر)" },
] as const;

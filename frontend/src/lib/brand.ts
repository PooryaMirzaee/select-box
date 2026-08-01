/** نام برند — فروشگاه دشتستان */
export const BRAND_NAME = "فروشگاه دشتستان";

export const BRAND_SHORT = "دشتستان";

export const BRAND_TAGLINE = "لوازم خانگی و سبک زندگی";

export const BRAND_TITLE = `${BRAND_NAME} — ${BRAND_TAGLINE}`;

/** لوگوی اصلی (اختیاری؛ وردمارک متنی در کامپوننت برند اولویت دارد) */
export const BRAND_LOGO_SRC = "/brand/selectbox-logo.png";

/** نسبت تصویر لوگو */
export const BRAND_LOGO_ASPECT = 16 / 9;

export function brandPageTitle(suffix: string): string {
  return `${suffix} | ${BRAND_NAME}`;
}

export const SUPPORT_EMAIL = "support@selectbox.ir";

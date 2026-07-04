/** نام برند — SelectBox */
export const BRAND_NAME = "SelectBox";

export const BRAND_TAGLINE = "لوازم خانگی و سبک زندگی";

export const BRAND_TITLE = `${BRAND_NAME} — ${BRAND_TAGLINE}`;

/** لوگوی اصلی */
export const BRAND_LOGO_SRC = "/brand/selectbox-logo.png";

/** نسبت تصویر لوگو */
export const BRAND_LOGO_ASPECT = 16 / 9;

export function brandPageTitle(suffix: string): string {
  return `${suffix} | ${BRAND_NAME}`;
}

export const SUPPORT_EMAIL = "support@selectbox.ir";

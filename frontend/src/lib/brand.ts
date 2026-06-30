/** نام برند — CORALAY */
export const BRAND_NAME = "CORALAY";

export const BRAND_TAGLINE = "پوشاک طرح‌محور";

export const BRAND_TITLE = `${BRAND_NAME} — ${BRAND_TAGLINE}`;

/** لوگوی اصلی (CORALAY + DESIGN LAB) */
export const BRAND_LOGO_SRC = "/brand/coralay-logo.png";

/** نسبت تصویر لوگو — برش محتوا از asset اصلی */
export const BRAND_LOGO_ASPECT = 712 / 835;

export function brandPageTitle(suffix: string): string {
  return `${suffix} | ${BRAND_NAME}`;
}

export const SUPPORT_EMAIL = "support@coralay.local";

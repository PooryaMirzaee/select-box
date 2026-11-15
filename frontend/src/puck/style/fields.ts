import type { Fields } from "@puckeditor/core";
import { DEFAULT_CHROME, type ChromeProps } from "./types";

type AnyFields = Fields<Record<string, unknown>>;

const spacingFields = {
  padT: { type: "text" as const, label: "پدینگ بالا" },
  padR: { type: "text" as const, label: "پدینگ راست" },
  padB: { type: "text" as const, label: "پدینگ پایین" },
  padL: { type: "text" as const, label: "پدینگ چپ" },
  marginT: { type: "text" as const, label: "مارجین بالا" },
  marginB: { type: "text" as const, label: "مارجین پایین" },
  gap: { type: "text" as const, label: "فاصله داخلی (gap)" },
  padTMobile: { type: "text" as const, label: "پدینگ بالا (موبایل)" },
  padBMobile: { type: "text" as const, label: "پدینگ پایین (موبایل)" },
};

const appearanceFields = {
  bgColor: { type: "text" as const, label: "رنگ پس‌زمینه" },
  bgGradient: {
    type: "text" as const,
    label: "گرادیان (مثلاً linear-gradient(...))",
  },
  bgImage: { type: "text" as const, label: "آدرس تصویر پس‌زمینه" },
  bgOverlay: { type: "text" as const, label: "پوشش پس‌زمینه (رنگ/شفافیت)" },
  textColor: { type: "text" as const, label: "رنگ متن" },
  fontSize: { type: "text" as const, label: "اندازه فونت" },
  fontWeight: {
    type: "select" as const,
    label: "وزن فونت",
    options: [
      { label: "پیش‌فرض", value: "" },
      { label: "نازک", value: "300" },
      { label: "عادی", value: "400" },
      { label: "متوسط", value: "500" },
      { label: "ضخیم", value: "700" },
      { label: "خیلی ضخیم", value: "800" },
    ],
  },
  lineHeight: { type: "text" as const, label: "ارتفاع خط" },
  letterSpacing: { type: "text" as const, label: "فاصله حروف" },
  textAlign: {
    type: "radio" as const,
    label: "تراز متن",
    options: [
      { label: "راست", value: "start" },
      { label: "وسط", value: "center" },
      { label: "چپ", value: "end" },
    ],
  },
  borderWidth: { type: "text" as const, label: "ضخامت حاشیه" },
  borderStyle: {
    type: "select" as const,
    label: "سبک حاشیه",
    options: [
      { label: "solid", value: "solid" },
      { label: "dashed", value: "dashed" },
      { label: "dotted", value: "dotted" },
      { label: "none", value: "none" },
    ],
  },
  borderColor: { type: "text" as const, label: "رنگ حاشیه" },
  borderRadius: { type: "text" as const, label: "گردی گوشه" },
  shadow: {
    type: "select" as const,
    label: "سایه",
    options: [
      { label: "بدون سایه", value: "none" },
      { label: "نرم", value: "soft" },
      { label: "کارت", value: "card" },
      { label: "سفارشی", value: "custom" },
    ],
  },
  shadowCustom: { type: "text" as const, label: "سایه سفارشی (CSS)" },
  widthMode: {
    type: "radio" as const,
    label: "عرض بلوک",
    options: [
      { label: "کانتینر فروشگاه", value: "container" },
      { label: "تمام‌عرض", value: "full" },
      { label: "سفارشی", value: "custom" },
    ],
  },
  maxWidth: { type: "text" as const, label: "حداکثر عرض (سفارشی)" },
};

const advancedFields = {
  customCss: {
    type: "textarea" as const,
    label: "CSS سفارشی (محدود به همین بلوک)",
  },
  htmlId: { type: "text" as const, label: "HTML id" },
  cssClass: { type: "text" as const, label: "کلاس CSS اضافی" },
  hideOnMobile: {
    type: "radio" as const,
    label: "مخفی در موبایل",
    options: [
      { label: "خیر", value: false },
      { label: "بله", value: true },
    ],
  },
  hideOnDesktop: {
    type: "radio" as const,
    label: "مخفی در دسکتاپ",
    options: [
      { label: "خیر", value: false },
      { label: "بله", value: true },
    ],
  },
  opacity: { type: "text" as const, label: "شفافیت (۰–۱)" },
  overflow: {
    type: "select" as const,
    label: "Overflow",
    options: [
      { label: "پیش‌فرض", value: "" },
      { label: "visible", value: "visible" },
      { label: "hidden", value: "hidden" },
      { label: "auto", value: "auto" },
    ],
  },
  zIndex: { type: "text" as const, label: "z-index" },
  animation: {
    type: "select" as const,
    label: "انیمیشن ورود",
    options: [
      { label: "بدون", value: "none" },
      { label: "محو شدن", value: "fadeIn" },
      { label: "از پایین", value: "slideUp" },
    ],
  },
};

export const CHROME_FIELD_KEYS = {
  spacing: Object.keys(spacingFields),
  appearance: Object.keys(appearanceFields),
  advanced: Object.keys(advancedFields),
} as const;

/** فیلدهای استایل را به فیلدهای محتوای بلوک اضافه می‌کند */
export function withChromeFields<T extends Record<string, unknown>>(
  contentFields: T,
) {
  return {
    ...contentFields,
    ...spacingFields,
    ...appearanceFields,
    ...advancedFields,
  };
}

export function chromeDefaults(overrides: Partial<ChromeProps> = {}): ChromeProps {
  return { ...DEFAULT_CHROME, ...overrides };
}

export type ChromeFieldBagMap = typeof spacingFields &
  typeof appearanceFields &
  typeof advancedFields;

export function asAnyFields(fields: Record<string, unknown>): AnyFields {
  return fields as AnyFields;
}

import type { Fields } from "@puckeditor/core";
import { DEFAULT_CHROME, type ChromeProps } from "./types";
import {
  BORDER_WIDTH_PRESETS,
  FONT_SIZE_PRESETS,
  GRADIENT_PRESETS,
  LINE_HEIGHT_PRESETS,
  MAX_WIDTH_PRESETS,
  RADIUS_PRESETS,
  SPACE_PRESETS,
  colorField,
  opacityField,
  presetField,
} from "./controls";

type AnyFields = Fields<Record<string, unknown>>;

const spacingFields = {
  padT: presetField("پدینگ بالا", SPACE_PRESETS, { placeholder: "مثلاً 1.25rem" }),
  padR: presetField("پدینگ راست", SPACE_PRESETS, { placeholder: "مثلاً 1rem" }),
  padB: presetField("پدینگ پایین", SPACE_PRESETS, { placeholder: "مثلاً 1.25rem" }),
  padL: presetField("پدینگ چپ", SPACE_PRESETS, { placeholder: "مثلاً 1rem" }),
  marginT: presetField("مارجین بالا", SPACE_PRESETS, { placeholder: "مثلاً 1rem" }),
  marginB: presetField("مارجین پایین", SPACE_PRESETS, { placeholder: "مثلاً 1rem" }),
  gap: presetField("فاصله داخلی (gap)", SPACE_PRESETS, { placeholder: "مثلاً 1rem" }),
  padTMobile: presetField("پدینگ بالا (موبایل)", SPACE_PRESETS, {
    placeholder: "مثلاً 0.75rem",
  }),
  padBMobile: presetField("پدینگ پایین (موبایل)", SPACE_PRESETS, {
    placeholder: "مثلاً 0.75rem",
  }),
};

const appearanceFields = {
  bgColor: colorField("رنگ پس‌زمینه"),
  bgGradient: presetField("گرادیان پس‌زمینه", GRADIENT_PRESETS, {
    placeholder: "linear-gradient(...)",
  }),
  bgImage: { type: "text" as const, label: "آدرس تصویر پس‌زمینه" },
  bgOverlay: colorField("پوشش پس‌زمینه"),
  textColor: colorField("رنگ متن"),
  fontSize: presetField("اندازه فونت", FONT_SIZE_PRESETS, {
    placeholder: "مثلاً 1.125rem",
  }),
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
  lineHeight: presetField("ارتفاع خط", LINE_HEIGHT_PRESETS, {
    placeholder: "مثلاً 1.6",
  }),
  letterSpacing: presetField(
    "فاصله حروف",
    [
      { label: "عادی", value: "0" },
      { label: "کمی باز", value: "0.02em" },
      { label: "باز", value: "0.05em" },
      { label: "خیلی باز", value: "0.1em" },
    ],
    { placeholder: "مثلاً 0.03em" },
  ),
  textAlign: {
    type: "radio" as const,
    label: "تراز متن",
    options: [
      { label: "راست", value: "start" },
      { label: "وسط", value: "center" },
      { label: "چپ", value: "end" },
    ],
  },
  borderWidth: presetField("ضخامت حاشیه", BORDER_WIDTH_PRESETS, {
    placeholder: "مثلاً 1px",
  }),
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
  borderColor: colorField("رنگ حاشیه"),
  borderRadius: presetField("گردی گوشه", RADIUS_PRESETS, {
    placeholder: "مثلاً 12px یا 1rem",
  }),
  shadow: {
    type: "radio" as const,
    label: "سایه",
    options: [
      { label: "بدون", value: "none" },
      { label: "نرم", value: "soft" },
      { label: "کارت", value: "card" },
      { label: "سفارشی", value: "custom" },
    ],
  },
  shadowCustom: { type: "text" as const, label: "سایه سفارشی (CSS box-shadow)" },
  widthMode: {
    type: "radio" as const,
    label: "عرض بلوک",
    options: [
      { label: "کانتینر فروشگاه", value: "container" },
      { label: "تمام‌عرض", value: "full" },
      { label: "سفارشی", value: "custom" },
    ],
  },
  maxWidth: presetField("حداکثر عرض (سفارشی)", MAX_WIDTH_PRESETS, {
    placeholder: "مثلاً 720px",
  }),
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
  opacity: opacityField("شفافیت"),
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
  zIndex: presetField(
    "z-index",
    [
      { label: "خودکار", value: "" },
      { label: "۱", value: "1" },
      { label: "۱۰", value: "10" },
      { label: "۲۰", value: "20" },
      { label: "۴۰", value: "40" },
      { label: "۵۰", value: "50" },
    ],
    { placeholder: "عدد دلخواه" },
  ),
  animation: {
    type: "radio" as const,
    label: "انیمیشن ورود",
    options: [
      { label: "بدون", value: "none" },
      { label: "محو", value: "fadeIn" },
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

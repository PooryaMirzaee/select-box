export type ThemeAppearance = {
  accent: string;
  accent_hot: string;
  accent_fg: string;
  amazing_from: string;
  amazing_to: string;
  bg: string;
  fg: string;
  fg_muted: string;
  border: string;
  card: string;
  shop_max: string;
  radius: string;
  header_bg: string;
};

export const DEFAULT_APPEARANCE: ThemeAppearance = {
  accent: "#ff6a00",
  accent_hot: "#ef4056",
  accent_fg: "#ffffff",
  amazing_from: "#ff6a00",
  amazing_to: "#ff3d00",
  bg: "#f5f5f5",
  fg: "#212121",
  fg_muted: "#81858b",
  border: "#e0e0e2",
  card: "#ffffff",
  shop_max: "1336px",
  radius: "1rem",
  header_bg: "rgba(255, 255, 255, 0.96)",
};

export const APPEARANCE_FIELDS: {
  key: keyof ThemeAppearance;
  label: string;
  type: "color" | "text";
}[] = [
  { key: "accent", label: "رنگ اصلی", type: "color" },
  { key: "accent_hot", label: "رنگ داغ / تخفیف", type: "color" },
  { key: "accent_fg", label: "متن روی رنگ اصلی", type: "color" },
  { key: "amazing_from", label: "گرادیان شگفت (شروع)", type: "color" },
  { key: "amazing_to", label: "گرادیان شگفت (پایان)", type: "color" },
  { key: "bg", label: "پس‌زمینه", type: "color" },
  { key: "fg", label: "متن اصلی", type: "color" },
  { key: "fg_muted", label: "متن کم‌رنگ", type: "color" },
  { key: "border", label: "حاشیه", type: "color" },
  { key: "card", label: "کارت", type: "color" },
  { key: "header_bg", label: "پس‌زمینه هدر", type: "text" },
  { key: "shop_max", label: "حداکثر عرض فروشگاه", type: "text" },
  { key: "radius", label: "شعاع گوشه", type: "text" },
];

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const RGBA = /^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+\s*)?\)$/;
const LENGTH = /^[\d.]+(px|rem|em|%)$/;

function safeColor(value: string, fallback: string): string {
  const v = value.trim();
  if (HEX.test(v) || RGBA.test(v)) return v;
  return fallback;
}

function safeLength(value: string, fallback: string): string {
  const v = value.trim();
  if (LENGTH.test(v)) return v;
  return fallback;
}

/** نرمال‌سازی امن برای تزریق در CSS — جلوگیری از تزریق استایل/اسکریپت */
export function sanitizeAppearance(raw: Partial<ThemeAppearance> | null | undefined): ThemeAppearance {
  const base = { ...DEFAULT_APPEARANCE, ...(raw || {}) };
  return {
    accent: safeColor(base.accent, DEFAULT_APPEARANCE.accent),
    accent_hot: safeColor(base.accent_hot, DEFAULT_APPEARANCE.accent_hot),
    accent_fg: safeColor(base.accent_fg, DEFAULT_APPEARANCE.accent_fg),
    amazing_from: safeColor(base.amazing_from, DEFAULT_APPEARANCE.amazing_from),
    amazing_to: safeColor(base.amazing_to, DEFAULT_APPEARANCE.amazing_to),
    bg: safeColor(base.bg, DEFAULT_APPEARANCE.bg),
    fg: safeColor(base.fg, DEFAULT_APPEARANCE.fg),
    fg_muted: safeColor(base.fg_muted, DEFAULT_APPEARANCE.fg_muted),
    border: safeColor(base.border, DEFAULT_APPEARANCE.border),
    card: safeColor(base.card, DEFAULT_APPEARANCE.card),
    shop_max: safeLength(base.shop_max, DEFAULT_APPEARANCE.shop_max),
    radius: safeLength(base.radius, DEFAULT_APPEARANCE.radius),
    header_bg: safeColor(base.header_bg, DEFAULT_APPEARANCE.header_bg),
  };
}

export function appearanceToCss(input: ThemeAppearance): string {
  const a = sanitizeAppearance(input);
  return `:root {
  --accent: ${a.accent};
  --accent-hot: ${a.accent_hot};
  --accent-fg: ${a.accent_fg};
  --accent-soft: color-mix(in srgb, ${a.accent} 12%, transparent);
  --amazing-from: ${a.amazing_from};
  --amazing-to: ${a.amazing_to};
  --bg: ${a.bg};
  --fg: ${a.fg};
  --fg-muted: ${a.fg_muted};
  --border: ${a.border};
  --card: ${a.card};
  --shop-max: ${a.shop_max};
  --header-bg: ${a.header_bg};
  --radius-shop: ${a.radius};
}`;
}

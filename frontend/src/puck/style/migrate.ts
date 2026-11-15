import type { Data } from "@puckeditor/core";
import { DEFAULT_CHROME } from "./types";
import { sanitizeCss } from "./sanitizeCss";

export const SCHEMA_VERSION = 2;

type LooseData = Data & {
  root?: { props?: Record<string, unknown> };
  content?: Array<{ type: string; props: Record<string, unknown> }>;
  zones?: Record<string, Array<{ type: string; props: Record<string, unknown> }>>;
};

function mergeChrome(props: Record<string, unknown>): Record<string, unknown> {
  const next = { ...props };

  // مهاجرت‌های فیلد قدیمی قبل از پر کردن پیش‌فرض‌ها
  if (next.align && next.textAlign == null) {
    next.textAlign = next.align;
  }
  if (next.style && next.cardStyle == null && (next.style === "card" || next.style === "gradient")) {
    next.cardStyle = next.style;
    delete next.style;
  }
  if (next.gap && next.colGap == null && ["sm", "md", "lg"].includes(String(next.gap))) {
    next.colGap = next.gap;
  }
  if (
    next.sourceMode == null &&
    (next.productCount != null || next.autoplay != null || next.limit != null || next.showFallback != null)
  ) {
    next.sourceMode = "live";
  }

  for (const [key, value] of Object.entries(DEFAULT_CHROME)) {
    if (next[key] === undefined || next[key] === null) {
      next[key] = value;
    }
  }
  if (typeof next.customCss === "string") {
    next.customCss = sanitizeCss(next.customCss);
  }
  return next;
}

/** بلوک‌هایی که خودشان shop-container دارند — عرض بلوک باید full بماند */
const FULL_WIDTH_TYPES = new Set([
  "HeroCarousel",
  "TrustStrip",
  "AmazingDeals",
  "CategoryCircles",
  "ProductRail",
  "PromoBanners",
  "ProductGrid",
]);

function migrateItem(item: { type: string; props: Record<string, unknown> }) {
  const props = { ...(item.props || {}) };
  if (FULL_WIDTH_TYPES.has(item.type) && props.widthMode == null) {
    props.widthMode = "full";
  }
  return {
    ...item,
    props: mergeChrome(props),
  };
}

/** افزودن پیش‌فرض‌های StyleKit به دادهٔ قدیمی بدون شکستن چیدمان */
export function migratePuckData(data: Data | null | undefined): Data {
  if (!data) {
    return {
      root: { props: { schemaVersion: SCHEMA_VERSION } },
      content: [],
    } as Data;
  }
  const loose = data as LooseData;
  const rootProps: Record<string, unknown> = { ...(loose.root?.props || {}) };
  if (typeof rootProps.pageCustomCss === "string") {
    rootProps.pageCustomCss = sanitizeCss(rootProps.pageCustomCss as string);
  }
  rootProps.schemaVersion = SCHEMA_VERSION;

  const content = (loose.content || []).map(migrateItem);
  const zones: LooseData["zones"] = {};
  if (loose.zones) {
    for (const [key, items] of Object.entries(loose.zones)) {
      zones[key] = items.map(migrateItem);
    }
  }

  return {
    ...loose,
    root: { ...(loose.root || {}), props: rootProps },
    content,
    ...(Object.keys(zones).length ? { zones } : {}),
  } as Data;
}

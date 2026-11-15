"use client";

import type { PuckMetadata } from "./types";

export function meta(puck: { metadata?: unknown }): PuckMetadata {
  return (puck.metadata as PuckMetadata) || {
    heroBanners: [],
    promoBanners: [],
    categories: [],
    productsLatest: [],
    productsAmazing: [],
  };
}

export function asBool(v: unknown, fallback = false) {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "yes" || v === 1 || v === "1") return true;
  if (v === "false" || v === "no" || v === 0 || v === "0") return false;
  return fallback;
}

export function pickProducts(m: PuckMetadata, source: string, count: number) {
  const pool = source === "amazing" ? m.productsAmazing : m.productsLatest;
  return (pool || []).slice(0, Math.max(1, count));
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="shop-container py-6">
      <div className="rounded-xl border border-dashed border-theme bg-card px-4 py-8 text-center text-sm text-muted">
        {children}
      </div>
    </div>
  );
}

export const spacerH: Record<"sm" | "md" | "lg" | "xl", string> = {
  sm: "h-4",
  md: "h-8",
  lg: "h-14",
  xl: "h-24",
};

export const bannerH: Record<"sm" | "md" | "lg", string> = {
  sm: "h-32 sm:h-40",
  md: "h-44 sm:h-56",
  lg: "h-56 sm:h-72",
};

export const gapCls: Record<"sm" | "md" | "lg", string> = {
  sm: "gap-3",
  md: "gap-5",
  lg: "gap-8",
};

export const SOURCE_MODE_FIELD = {
  type: "radio" as const,
  label: "منبع محتوا",
  options: [
    { label: "زنده از فروشگاه", value: "live" },
    { label: "دستی", value: "manual" },
  ],
};

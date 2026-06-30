"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowLeft, Coffee, Shirt } from "@/components/icons";

import type { BusinessLanding } from "@/lib/api";
import { formatToman } from "@/lib/utils";

const TYPE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  tshirt: Shirt,
  hoodie: Shirt,
  mug: Coffee,
};

const TYPE_GRADIENT: Record<string, string> = {
  tshirt: "from-[color-mix(in_srgb,var(--accent)_25%,transparent)] to-transparent",
  hoodie: "from-[color-mix(in_srgb,var(--accent)_18%,var(--fg)_5%)] to-transparent",
  mug: "from-[color-mix(in_srgb,var(--accent)_20%,transparent)] to-transparent",
};

export function BusinessProductCards({ landings }: { landings: BusinessLanding[] }) {
  if (!landings.length) return null;

  return (
    <section id="products" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">محصولات سازمانی</h2>
          <p className="mt-1 text-sm text-muted">برای هر نوع محصول، لندینگ اختصاصی با قیمت پلکانی</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {landings.map((l) => {
          const Icon = TYPE_ICONS[l.slug] ?? Shirt;
          const lowestPrice = l.pricing_tiers.length
            ? Math.min(...l.pricing_tiers.map((t) => t.unit_price_toman))
            : null;

          return (
            <Link
              key={l.slug}
              href={`/business/${l.slug}`}
              className="group card-theme relative overflow-hidden p-6 transition hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]"
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60 ${TYPE_GRADIENT[l.slug] ?? TYPE_GRADIENT.tshirt}`}
                aria-hidden
              />
              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] transition group-hover:scale-105">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{l.name_fa}</h3>
                {l.subtitle ? (
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{l.subtitle}</p>
                ) : null}
                <div className="mt-4 flex items-center justify-between text-sm">
                  {lowestPrice ? (
                    <span className="text-muted">
                      از{" "}
                      <span className="font-medium text-[var(--accent)]">{formatToman(lowestPrice)}</span>
                    </span>
                  ) : (
                    <span className="text-muted">حداقل {l.min_order_qty.toLocaleString("fa-IR")} عدد</span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[var(--accent)] opacity-0 transition group-hover:opacity-100">
                    جزئیات
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

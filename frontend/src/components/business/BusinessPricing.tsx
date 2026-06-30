"use client";

import { useMemo, useState } from "react";

import type { BusinessPricingTier } from "@/lib/api";
import { formatToman } from "@/lib/utils";

function unitPriceForQty(tiers: BusinessPricingTier[], qty: number): number {
  const sorted = [...tiers].sort((a, b) => b.min_qty - a.min_qty);
  for (const tier of sorted) {
    if (qty >= tier.min_qty) return tier.unit_price_toman;
  }
  return sorted[sorted.length - 1]?.unit_price_toman ?? 0;
}

type Props = {
  tiers: BusinessPricingTier[];
  minOrderQty: number;
};

export function BusinessPricing({ tiers, minOrderQty }: Props) {
  const maxQty = tiers.length ? Math.max(tiers[tiers.length - 1].min_qty * 2, 200) : 200;
  const [qty, setQty] = useState(Math.max(minOrderQty, tiers[0]?.min_qty ?? minOrderQty));

  const unitPrice = useMemo(() => unitPriceForQty(tiers, qty), [tiers, qty]);
  const total = unitPrice * qty;

  if (!tiers.length) return null;

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="card-theme overflow-hidden">
        <div className="border-b border-theme p-6 sm:p-8">
          <h2 className="text-xl font-semibold sm:text-2xl">قیمت پلکانی</h2>
          <p className="mt-2 text-sm text-muted">تعداد را انتخاب کنید — قیمت واحد به‌صورت لحظه‌ای محاسبه می‌شود.</p>
        </div>

        <div className="grid gap-8 p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <div className="grid gap-3">
              {tiers.map((tier) => {
                const active = qty >= tier.min_qty;
                return (
                  <div
                    key={tier.label_fa}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                      active
                        ? "border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] bg-[var(--accent-soft)]"
                        : "border-theme"
                    }`}
                  >
                    <span className={active ? "font-medium text-[var(--fg)]" : "text-muted"}>{tier.label_fa}</span>
                    <span className={active ? "font-medium text-[var(--accent)]" : "text-muted"}>
                      {formatToman(tier.unit_price_toman)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col justify-center rounded-2xl border border-theme bg-[var(--bg-elevated)] p-6">
            <label htmlFor="biz-qty" className="text-sm font-medium">
              تعداد سفارش
            </label>
            <input
              id="biz-qty"
              type="range"
              min={minOrderQty}
              max={maxQty}
              step={1}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="mt-4 w-full accent-[var(--accent)]"
            />
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-semibold tabular-nums">{qty.toLocaleString("fa-IR")}</span>
              <span className="text-xs text-muted">عدد</span>
            </div>

            <div className="mt-6 space-y-2 border-t border-theme pt-6 text-sm">
              <div className="flex justify-between text-muted">
                <span>قیمت واحد</span>
                <span className="tabular-nums text-[var(--fg)]">{formatToman(unitPrice)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>جمع تقریبی</span>
                <span className="text-lg tabular-nums text-[var(--accent)]">{formatToman(total)}</span>
              </div>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-muted">
              قیمت نهایی پس از تأیید طرح، سایزبندی و زمان تحویل در پیش‌فاکتور اعلام می‌شود.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

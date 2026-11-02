"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import type { ProductSummary } from "@/lib/api";
import { SelectBoxLogo } from "@/components/brand/SelectBoxLogo";
import { useMounted } from "@/lib/hooks/useMounted";
import { mediaUrl } from "@/lib/media";
import { cn, formatToman } from "@/lib/utils";

type Props = {
  product: ProductSummary;
  index?: number;
  /** کارت داخل ریل شگفت‌انگیز */
  variant?: "default" | "amazing";
};

export function ProductCard({ product, index = 0, variant = "default" }: Props) {
  const mounted = useMounted();
  const amazing = variant === "amazing";

  return (
    <motion.div
      initial={mounted ? { opacity: 0, y: 10 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index, 8) * 0.03, duration: 0.3 }}
      className="h-full"
    >
      <Link
        href={`/product/${product.slug}`}
        className={cn(
          "group flex h-full flex-col overflow-hidden bg-card transition duration-300",
          amazing
            ? "rounded-xl shadow-[var(--shadow-card)] ring-1 ring-black/5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
            : "rounded-xl border border-theme hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] hover:shadow-[var(--shadow-soft)]",
        )}
      >
        <div className="relative aspect-square overflow-hidden bg-white dark:bg-[var(--bg-elevated)]">
          {amazing ? (
            <span className="absolute start-2 top-2 z-10 rounded-md bg-[var(--accent-hot)] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              ویژه
            </span>
          ) : null}
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl(product.image_url)}
              alt={product.title}
              loading={index < 4 ? "eager" : "lazy"}
              decoding="async"
              className="product-img h-full w-full object-contain p-2.5 transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full items-center justify-center opacity-40">
              <SelectBoxLogo href={null} size="sm" />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-2.5 sm:p-3">
          <p className="line-clamp-2 min-h-[2.4rem] text-[12px] font-medium leading-snug text-[var(--fg)] sm:text-[13px]">
            {product.title}
          </p>
          <div className="mt-auto pt-2">
            <p className="flex flex-wrap items-baseline gap-x-1">
              <span className="text-[15px] font-bold tabular-nums text-[var(--accent)] sm:text-base">
                {formatToman(product.base_price, false)}
              </span>
              <span className="text-[10px] font-medium text-muted">تومان</span>
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

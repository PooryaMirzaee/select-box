"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import type { ProductSummary } from "@/lib/api";
import { SelectBoxLogo } from "@/components/brand/SelectBoxLogo";
import { useMounted } from "@/lib/hooks/useMounted";
import { mediaUrl } from "@/lib/media";
import { formatToman } from "@/lib/utils";

export function ProductCard({ product, index = 0 }: { product: ProductSummary; index?: number }) {
  const mounted = useMounted();

  return (
    <motion.div
      initial={mounted ? { opacity: 0, y: 12 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.35 }}
    >
      <Link
        href={`/product/${product.slug}`}
        className="group block overflow-hidden rounded-xl border border-theme bg-card transition duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] hover:shadow-[var(--shadow-soft)]"
      >
        <div className="relative aspect-square overflow-hidden bg-[var(--card)] dark:bg-[var(--bg-elevated)]">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl(product.image_url)}
              alt={product.title}
              loading={index < 2 ? "eager" : "lazy"}
              decoding="async"
              className="product-img h-full w-full object-contain p-2 transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center opacity-50">
              <SelectBoxLogo href={null} size="sm" />
            </div>
          )}
        </div>
        <div className="p-2.5 sm:p-3">
          <p className="line-clamp-2 min-h-[2.25rem] text-[13px] font-medium leading-snug">
            {product.title}
          </p>
          <p className="mt-1.5 text-sm">
            <span className="font-bold">{formatToman(product.base_price, false)}</span>
            <span className="ms-1 text-[10px] font-normal text-muted">تومان</span>
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

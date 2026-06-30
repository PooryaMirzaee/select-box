"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import type { ProductSummary } from "@/lib/api";
import { CoralayLogo } from "@/components/brand/CoralayLogo";
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
      transition={{ delay: index * 0.04, duration: 0.4 }}
    >
      <Link
        href={`/product/${product.slug}`}
        className="group block overflow-hidden rounded-2xl border border-theme bg-card transition duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] hover:shadow-[var(--shadow-soft)]"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-[var(--bg-elevated)]">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl(product.image_url)}
              alt={product.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center opacity-50">
              <CoralayLogo href={null} size="sm" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[color-mix(in_srgb,var(--bg)_75%,transparent)] to-transparent opacity-0 transition group-hover:opacity-100" />
        </div>
        <div className="p-3 sm:p-4">
          <p className="line-clamp-2 text-sm font-medium leading-snug">{product.title}</p>
          <p className="mt-1.5 text-xs text-muted sm:text-sm">{formatToman(product.base_price)}</p>
        </div>
      </Link>
    </motion.div>
  );
}

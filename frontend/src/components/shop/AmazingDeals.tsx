"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import type { ProductSummary } from "@/lib/api";
import { ProductCard } from "@/components/shop/ProductCard";
import { useMounted } from "@/lib/hooks/useMounted";
import { ArrowLeft, Sparkles } from "@/components/icons";

type Props = {
  products: ProductSummary[];
  title?: string;
  href?: string;
};

/** پیشنهاد شگفت‌انگیز — ریل نارنجی افقی به سبک مارکت‌پلیس */
export function AmazingDeals({
  products,
  title = "پیشنهاد شگفت‌انگیز",
  href = "/catalog",
}: Props) {
  const mounted = useMounted();
  if (!products.length) return null;

  return (
    <section className="shop-container py-4 sm:py-6" aria-label={title}>
      <motion.div
        initial={mounted ? { opacity: 0, y: 16 } : false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        className="overflow-hidden rounded-2xl"
        style={{
          background: `linear-gradient(115deg, var(--amazing-from) 0%, var(--amazing-to) 55%, #ff8a3d 100%)`,
        }}
      >
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:gap-0 sm:p-0">
          <div className="flex shrink-0 flex-col justify-between gap-4 text-white sm:w-44 sm:p-6 lg:w-52">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                ویژه امروز
              </div>
              <h2 className="mt-3 text-xl font-bold leading-snug sm:text-2xl">{title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-white/85 sm:text-sm">
                فرصت محدود — همین حالا بخرید
              </p>
            </div>
            <Link
              href={href}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold text-[var(--accent)] transition hover:bg-white/95"
            >
              مشاهده همه
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>

          <div className="min-w-0 flex-1 sm:bg-white/10 sm:py-4 sm:pe-4 sm:ps-2">
            <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 sm:gap-3">
              {products.map((p, i) => (
                <div
                  key={p.id}
                  className="w-[9.5rem] shrink-0 sm:w-[11.5rem]"
                >
                  <ProductCard product={p} index={i} variant="amazing" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

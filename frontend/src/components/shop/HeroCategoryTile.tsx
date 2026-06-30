"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import type { CategoryCardItem } from "@/components/shop/CategoryCard";
import { useMounted } from "@/lib/hooks/useMounted";
import { cn } from "@/lib/utils";

type Props = {
  category: CategoryCardItem;
  href: string;
  className?: string;
  index?: number;
  size?: "default" | "featured";
  subtitle?: string;
};

export function HeroCategoryTile({
  category,
  href,
  className,
  index = 0,
  size = "default",
  subtitle,
}: Props) {
  const featured = size === "featured";
  const mounted = useMounted();

  return (
    <motion.div
      initial={mounted ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
      className={cn("h-full min-h-[140px]", className)}
    >
      <Link
        href={href}
        className={cn(
          "group relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-2xl border border-theme/60 bg-card",
          "transition duration-300 active:scale-[0.98] hover:border-[var(--accent)]/50",
          featured && "min-h-[200px] sm:min-h-[280px]",
        )}
      >
        {category.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={category.image_url}
            alt={category.name_fa}
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--accent)]/20 via-[var(--bg-elevated)] to-[var(--bg)]"
            aria-hidden
          >
            <span className="text-4xl font-light text-[var(--accent)]/40 sm:text-5xl">
              {category.name_fa.charAt(0)}
            </span>
          </div>
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent dark:from-black/85"
          aria-hidden
        />
        <div className="relative mt-auto p-4 sm:p-5">
          <span
            className={cn(
              "block font-medium leading-tight text-white drop-shadow-md",
              featured ? "text-xl sm:text-2xl" : "text-base sm:text-lg",
            )}
          >
            {category.name_fa}
          </span>
          <span className="mt-1 block text-xs text-white/75">
            {subtitle ?? "مشاهده مجموعه"}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

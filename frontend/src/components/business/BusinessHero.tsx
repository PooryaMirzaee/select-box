"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import type { BusinessLanding, BusinessStat } from "@/lib/api";
import { useMounted } from "@/lib/hooks/useMounted";

type Props = {
  landing: BusinessLanding;
  productType?: string;
  quoteForm?: React.ReactNode;
};

export function BusinessStats({ stats }: { stats: BusinessStat[] }) {
  if (!stats.length) return null;
  return (
    <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-theme bg-[var(--bg-elevated)] px-3 py-4 text-center sm:px-4"
        >
          <p className="text-lg font-semibold text-[var(--accent)] sm:text-xl">{s.value}</p>
          <p className="mt-1 text-[10px] text-muted sm:text-xs">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export function BusinessHero({ landing, productType, quoteForm }: Props) {
  const mounted = useMounted();
  const secondaryHref =
    productType && productType !== "hub"
      ? `/catalog?${productType}`
      : "/business#products";

  return (
    <section className="relative overflow-hidden border-b border-theme">
      <div className="hero-accent-glow pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      {landing.hero_image_url ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08] dark:opacity-[0.12]"
          style={{
            backgroundImage: `url(${landing.hero_image_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden
        />
      ) : null}

      <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-8 sm:pb-14 sm:pt-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start lg:gap-10">
          <motion.div
            initial={mounted ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {landing.hero_badge ? (
              <p className="inline-flex items-center gap-2 rounded-full border border-theme bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-medium tracking-wide text-[var(--accent)]">
                {landing.hero_badge}
              </p>
            ) : null}
            <h1 className="mt-4 text-balance text-2xl font-semibold tracking-tight sm:text-4xl">
              {landing.title}
            </h1>
            {landing.subtitle ? (
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">{landing.subtitle}</p>
            ) : null}
            <BusinessStats stats={landing.stats} />
            <div className="mt-6 flex flex-wrap gap-3 lg:hidden">
              <a
                href="#quote-form"
                className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--accent)] px-6 text-sm font-medium text-[var(--accent-fg)] shadow-[var(--shadow-soft)] transition hover:opacity-90"
              >
                {landing.cta_primary}
              </a>
              {landing.cta_secondary ? (
                <Link
                  href={secondaryHref}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-theme px-6 text-sm font-medium transition hover:bg-[var(--bg-elevated)]"
                >
                  {landing.cta_secondary}
                </Link>
              ) : null}
            </div>
            <div className="mt-6 hidden flex-wrap gap-3 lg:flex">
              <a
                href="#pricing"
                className="inline-flex min-h-[44px] items-center rounded-full border border-theme px-6 text-sm font-medium transition hover:bg-[var(--bg-elevated)]"
              >
                مشاهده قیمت‌ها
              </a>
              {landing.cta_secondary ? (
                <Link
                  href={secondaryHref}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-theme px-6 text-sm text-muted transition hover:text-[var(--fg)]"
                >
                  {landing.cta_secondary}
                </Link>
              ) : null}
            </div>
          </motion.div>

          {quoteForm ? (
            <motion.div
              initial={mounted ? { opacity: 0, y: 16 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="hidden lg:block"
            >
              {quoteForm}
            </motion.div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

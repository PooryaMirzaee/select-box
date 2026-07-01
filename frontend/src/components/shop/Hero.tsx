"use client";

import type { HomepageHeroConfig } from "@/lib/homepage";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "@/components/icons";

import type { CategoryCardItem } from "@/components/shop/CategoryCard";
import { HeroCategoryTile } from "@/components/shop/HeroCategoryTile";
import { useMounted } from "@/lib/hooks/useMounted";
import { cn } from "@/lib/utils";

type Props = {
  categories: CategoryCardItem[];
  config: HomepageHeroConfig;
};

function DesktopBento({ categories }: { categories: CategoryCardItem[] }) {
  const n = categories.length;
  if (n === 0) return null;

  if (n === 1) {
    return (
      <HeroCategoryTile
        category={categories[0]}
        href={`/browse/${categories[0].path}`}
        size="featured"
        className="min-h-[300px] lg:min-h-[340px]"
      />
    );
  }

  if (n === 2) {
    return (
      <div className="grid min-h-[280px] grid-cols-2 gap-3 lg:min-h-[320px]">
        {categories.map((c, i) => (
          <HeroCategoryTile
            key={c.id}
            category={c}
            href={`/browse/${c.path}`}
            index={i}
            size="featured"
            className="h-full"
          />
        ))}
      </div>
    );
  }

  const [featured, ...rest] = categories;

  return (
    <div className="grid min-h-[320px] grid-cols-4 grid-rows-2 gap-3 lg:min-h-[360px]">
      <div className="col-span-2 row-span-2">
        <HeroCategoryTile
          category={featured}
          href={`/browse/${featured.path}`}
          index={0}
          size="featured"
          className="h-full min-h-full"
        />
      </div>
      {rest.slice(0, 2).map((c, i) => (
        <HeroCategoryTile
          key={c.id}
          category={c}
          href={`/browse/${c.path}`}
          index={i + 1}
          className="h-full min-h-[150px]"
        />
      ))}
      {rest.length > 2 ? (
        <div className="col-span-2 grid grid-cols-2 gap-3">
          {rest.slice(2, 6).map((c, i) => (
            <HeroCategoryTile
              key={c.id}
              category={c}
              href={`/browse/${c.path}`}
              index={i + 3}
              className="min-h-[140px]"
            />
          ))}
        </div>
      ) : rest.length === 1 ? (
        <div className="col-span-2">
          <HeroCategoryTile
            category={rest[0]}
            href={`/browse/${rest[0].path}`}
            index={1}
            className="h-full min-h-[150px]"
          />
        </div>
      ) : null}
    </div>
  );
}

export function Hero({ categories, config }: Props) {
  const visibleCategories = categories.slice(0, config.category_limit);
  const hasCategories = config.show_categories_bento && visibleCategories.length > 0;
  const mounted = useMounted();

  return (
    <section className="relative overflow-hidden border-b border-theme">
      <div className="hero-accent-glow pointer-events-none absolute inset-0 opacity-60" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-8 sm:pb-14 sm:pt-12">
        <motion.header
          initial={mounted ? { opacity: 0, y: 10 } : false}
          animate={mounted ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.4 }}
          className="mb-6 flex items-end justify-between gap-4 sm:mb-8"
        >
          <div className="max-w-md">
            {config.badge ? (
              <p className="inline-flex items-center gap-2 rounded-full border border-theme bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-medium tracking-wide text-[var(--accent)]">
                {config.badge}
              </p>
            ) : null}
            <h1 className="mt-4 text-balance text-2xl font-semibold tracking-tight sm:text-4xl">{config.title}</h1>
            {config.subtitle ? (
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">{config.subtitle}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              {config.primary_cta.label && config.primary_cta.href ? (
                <Link
                  href={config.primary_cta.href}
                  className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--accent)] px-6 text-sm font-medium text-[var(--accent-fg)] shadow-[var(--shadow-soft)] transition hover:opacity-90"
                >
                  {config.primary_cta.label}
                </Link>
              ) : null}
              {config.secondary_cta.label && config.secondary_cta.href ? (
                <Link
                  href={config.secondary_cta.href}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-theme px-6 text-sm font-medium transition hover:bg-[var(--bg-elevated)]"
                >
                  {config.secondary_cta.label}
                </Link>
              ) : null}
              {config.mobile_categories_cta.label && config.mobile_categories_cta.href ? (
                <Link
                  href={config.mobile_categories_cta.href}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-theme px-6 text-sm text-muted transition hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] hover:text-[var(--fg)] sm:hidden"
                >
                  {config.mobile_categories_cta.label}
                </Link>
              ) : null}
            </div>
          </div>
          {config.categories_link_label && config.categories_link_href ? (
            <Link
              href={config.categories_link_href}
              className="hidden shrink-0 items-center gap-1 text-sm text-muted transition hover:text-[var(--fg)] sm:flex"
            >
              {config.categories_link_label}
              <ArrowLeft className="h-4 w-4" />
            </Link>
          ) : null}
        </motion.header>

        {hasCategories ? (
          <>
            <div className="md:hidden">
              <div
                className={cn(
                  "-mx-4 flex gap-3 overflow-x-auto px-4 pb-1",
                  "snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                )}
              >
                {visibleCategories.map((c, i) => (
                  <div
                    key={c.id}
                    className={cn(
                      "shrink-0 snap-center",
                      i === 0 ? "w-[85vw] max-w-[340px]" : "w-[72vw] max-w-[280px]",
                    )}
                  >
                    <HeroCategoryTile
                      category={c}
                      href={`/browse/${c.path}`}
                      index={i}
                      size={i === 0 ? "featured" : "default"}
                    />
                  </div>
                ))}
              </div>
              {visibleCategories.length > 1 ? (
                <p className="mt-3 text-center text-[10px] tracking-wide text-muted">← بکشید →</p>
              ) : null}
              {config.categories_link_href ? (
                <Link
                  href={config.categories_link_href}
                  className="mt-4 flex min-h-[44px] items-center justify-center rounded-full border border-theme text-sm text-muted transition hover:border-[var(--accent)]/40"
                >
                  {config.categories_link_label || "مشاهده همه"}
                </Link>
              ) : null}
            </div>

            <div className="hidden md:block">
              <DesktopBento categories={visibleCategories} />
            </div>
          </>
        ) : config.show_categories_bento ? (
          <Link
            href="/browse"
            className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-theme text-muted"
          >
            دسته‌بندی‌ها را از پنل ادمین اضافه کنید
          </Link>
        ) : null}
      </div>
    </section>
  );
}

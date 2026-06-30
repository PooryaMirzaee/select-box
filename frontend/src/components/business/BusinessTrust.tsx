"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { BusinessFeatureIcon } from "./BusinessFeatures";
import type { BusinessTestimonial, BusinessTrustBadge, BusinessTrustLogo } from "@/lib/api";
import { cn } from "@/lib/utils";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5 text-[var(--accent)]" aria-label={`${rating} از ۵`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={cn("text-sm", i < rating ? "opacity-100" : "opacity-25")}>
          ★
        </span>
      ))}
    </span>
  );
}

function LogoStrip({ logos }: { logos: BusinessTrustLogo[] }) {
  if (!logos.length) return null;
  const doubled = [...logos, ...logos];
  return (
    <div className="relative overflow-hidden border-y border-theme bg-[var(--bg-elevated)] py-8">
      <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-16 bg-gradient-to-l from-transparent to-[var(--bg-elevated)]" />
      <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-16 bg-gradient-to-r from-transparent to-[var(--bg-elevated)]" />
      <div className="flex animate-[biz-marquee_28s_linear_infinite] gap-8 whitespace-nowrap" dir="ltr">
        {doubled.map((logo, i) => (
          <div
            key={`${logo.name_fa}-${i}`}
            className="inline-flex shrink-0 items-center gap-3 rounded-xl border border-theme bg-[var(--card)] px-5 py-3"
          >
            {logo.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo.logo_url} alt={logo.name_fa} className="h-8 w-auto max-w-[100px] object-contain" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                {logo.name_fa.charAt(0)}
              </span>
            )}
            <span className="text-sm font-medium text-muted">{logo.name_fa}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type Props = {
  sectionTitle?: string | null;
  logos: BusinessTrustLogo[];
  badges: BusinessTrustBadge[];
  testimonials: BusinessTestimonial[];
};

export function BusinessTrust({ sectionTitle, logos, badges, testimonials }: Props) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (testimonials.length <= 1) return;
    const t = setInterval(() => setActive((a) => (a + 1) % testimonials.length), 6000);
    return () => clearInterval(t);
  }, [testimonials.length]);

  const hasContent = logos.length || badges.length || testimonials.length;
  if (!hasContent) return null;

  return (
    <section id="trust" className="border-t border-theme">
      {logos.length ? <LogoStrip logos={logos} /> : null}

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="text-center text-xl font-semibold sm:text-2xl">
          {sectionTitle ?? "مورد اعتماد تیم‌ها و برندها"}
        </h2>

        {badges.length ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {badges.map((b) => (
              <div
                key={b.title}
                className="flex items-start gap-3 rounded-2xl border border-theme bg-[var(--card)] p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                  <BusinessFeatureIcon icon={b.icon} className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{b.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {testimonials.length ? (
          <div className="relative mx-auto mt-10 max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="card-theme p-6 text-center sm:p-8"
              >
                <Stars rating={testimonials[active].rating} />
                <p className="mt-4 text-balance text-sm leading-relaxed sm:text-base">
                  «{testimonials[active].quote}»
                </p>
                <footer className="mt-5">
                  <p className="font-medium">{testimonials[active].author_name}</p>
                  <p className="mt-1 text-xs text-muted">
                    {[testimonials[active].author_role, testimonials[active].company].filter(Boolean).join(" · ")}
                  </p>
                </footer>
              </motion.blockquote>
            </AnimatePresence>

            {testimonials.length > 1 ? (
              <div className="mt-4 flex justify-center gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`نظر ${i + 1}`}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      i === active ? "w-6 bg-[var(--accent)]" : "w-2 bg-[var(--border)]",
                    )}
                    onClick={() => setActive(i)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

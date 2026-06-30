"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { HomeBanner } from "@/lib/home-banners";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

type Props = {
  banners: HomeBanner[];
};

function BannerSlide({ banner }: { banner: HomeBanner }) {
  const imageSrc = mediaUrl(banner.image_mobile_url || banner.image_url);
  const desktopSrc = mediaUrl(banner.image_url);
  const hasText = Boolean(banner.title_fa || banner.subtitle_fa || banner.eyebrow_fa);
  const alignCenter = banner.text_align === "center";

  const inner = (
    <div className="relative aspect-[21/9] min-h-[180px] w-full overflow-hidden rounded-none sm:aspect-[3/1] sm:min-h-[220px] sm:rounded-2xl">
      {banner.image_url ? (
        <>
          <Image
            src={imageSrc || desktopSrc}
            alt={banner.title_fa || "بنر"}
            fill
            className="object-cover sm:hidden"
            sizes="100vw"
            priority
          />
          <Image
            src={desktopSrc}
            alt={banner.title_fa || "بنر"}
            fill
            className="hidden object-cover sm:block"
            sizes="(max-width: 1280px) 100vw, 1152px"
            priority
          />
        </>
      ) : null}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: (banner.overlay_opacity || 0) / 100 }}
        aria-hidden
      />
      {hasText ? (
        <div
          className={cn(
            "absolute inset-0 flex flex-col justify-end p-5 sm:p-8",
            alignCenter ? "items-center text-center" : "items-start text-start",
          )}
        >
          {banner.eyebrow_fa ? (
            <p className="text-[11px] font-medium tracking-wide text-white/90 sm:text-xs">{banner.eyebrow_fa}</p>
          ) : null}
          {banner.title_fa ? (
            <h2 className="mt-1 text-balance text-lg font-semibold text-white sm:text-2xl">{banner.title_fa}</h2>
          ) : null}
          {banner.subtitle_fa ? (
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/85">{banner.subtitle_fa}</p>
          ) : null}
          {banner.cta_label && banner.cta_href ? (
            <span
              className={cn(
                "mt-4 inline-flex min-h-[40px] items-center rounded-full px-5 text-sm font-medium",
                banner.accent_style === "primary"
                  ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                  : "border border-white/40 bg-white/10 text-white backdrop-blur-sm",
              )}
            >
              {banner.cta_label}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (banner.cta_href) {
    const external = banner.cta_href.startsWith("http");
    if (external) {
      return (
        <a
          href={banner.cta_href}
          target={banner.open_in_new_tab ? "_blank" : undefined}
          rel={banner.open_in_new_tab ? "noreferrer" : undefined}
          className="block"
        >
          {inner}
        </a>
      );
    }
    return (
      <Link href={banner.cta_href} className="block">
        {inner}
      </Link>
    );
  }

  return inner;
}

export function HomeBannerCarousel({ banners }: Props) {
  const [index, setIndex] = useState(0);
  const count = banners.length;

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % count);
  }, [count]);

  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [count, next]);

  if (count === 0) return null;

  return (
    <section className="border-b border-theme bg-[var(--bg)]">
      <div className="relative mx-auto max-w-6xl px-0 sm:px-4 sm:py-4">
        <div className="relative overflow-hidden" dir="ltr">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {banners.map((banner) => (
              <div key={banner.id} className="w-full shrink-0">
                <BannerSlide banner={banner} />
              </div>
            ))}
          </div>
        </div>
        {count > 1 ? (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 sm:bottom-5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-label={`اسلاید ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/70",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";

import type { HomeBanner } from "@/lib/home-banners";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

type Props = {
  banner: HomeBanner;
};

export function HomePromoBanner({ banner }: Props) {
  const alignCenter = banner.text_align === "center";
  const isTextOnly = banner.variant === "text" || !banner.image_url;

  const cta =
    banner.cta_label && banner.cta_href ? (
      banner.cta_href.startsWith("http") ? (
        <a
          href={banner.cta_href}
          target={banner.open_in_new_tab ? "_blank" : undefined}
          rel={banner.open_in_new_tab ? "noreferrer" : undefined}
          className={cn(
            "inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-full px-8 text-sm font-medium transition",
            banner.accent_style === "primary"
              ? "bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90"
              : "border border-theme hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] hover:bg-[var(--bg-elevated)]",
          )}
        >
          {banner.cta_label}
        </a>
      ) : (
        <Link
          href={banner.cta_href}
          className={cn(
            "inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-full px-8 text-sm font-medium transition",
            banner.accent_style === "primary"
              ? "bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90"
              : "border border-theme hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] hover:bg-[var(--bg-elevated)]",
          )}
        >
          {banner.cta_label}
        </Link>
      )
    ) : null;

  if (!isTextOnly && banner.image_url) {
    const imageSrc = mediaUrl(banner.image_url);
    const mobileSrc = mediaUrl(banner.image_mobile_url || banner.image_url);
    const content = (
      <div className="relative min-h-[200px] overflow-hidden rounded-2xl sm:min-h-[240px]">
        <Image src={mobileSrc} alt={banner.title_fa || "بنر"} fill className="object-cover sm:hidden" sizes="100vw" />
        <Image
          src={imageSrc}
          alt={banner.title_fa || "بنر"}
          fill
          className="hidden object-cover sm:block"
          sizes="(max-width: 1280px) 100vw, 1152px"
        />
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: (banner.overlay_opacity || 0) / 100 }}
          aria-hidden
        />
        <div
          className={cn(
            "absolute inset-0 flex flex-col justify-center gap-3 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-10",
            alignCenter && "items-center text-center sm:flex-col",
          )}
        >
          <div className={cn("max-w-lg", alignCenter && "mx-auto")}>
            {banner.eyebrow_fa ? (
              <p className="text-xs font-medium tracking-wide text-[var(--accent)]">{banner.eyebrow_fa}</p>
            ) : null}
            {banner.title_fa ? (
              <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">{banner.title_fa}</h2>
            ) : null}
            {banner.subtitle_fa ? (
              <p className="mt-2 text-sm leading-relaxed text-white/85">{banner.subtitle_fa}</p>
            ) : null}
          </div>
          {cta}
        </div>
      </div>
    );

    if (banner.cta_href && !banner.cta_label) {
      return (
        <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
          <Link href={banner.cta_href} className="block">
            {content}
          </Link>
        </section>
      );
    }

    return <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">{content}</section>;
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
      <div className="card-theme relative overflow-hidden p-8 sm:p-10">
        <div
          className="pointer-events-none absolute -end-16 -top-16 h-48 w-48 rounded-full bg-[var(--accent-soft)] blur-3xl"
          aria-hidden
        />
        <div
          className={cn(
            "relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between",
            alignCenter && "items-center text-center sm:flex-col",
          )}
        >
          <div className={cn("max-w-lg", alignCenter && "mx-auto")}>
            {banner.eyebrow_fa ? (
              <p className="text-xs font-medium tracking-wide text-[var(--accent)]">{banner.eyebrow_fa}</p>
            ) : null}
            {banner.title_fa ? (
              <h2 className="mt-2 text-xl font-semibold sm:text-2xl">{banner.title_fa}</h2>
            ) : null}
            {banner.subtitle_fa ? (
              <p className="mt-2 text-sm text-muted">{banner.subtitle_fa}</p>
            ) : null}
          </div>
          {cta}
        </div>
      </div>
    </section>
  );
}

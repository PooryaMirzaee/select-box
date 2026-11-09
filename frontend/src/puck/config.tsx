"use client";

import Link from "next/link";
import type { Config } from "@puckeditor/core";
import { DropZone } from "@puckeditor/core";

import { AmazingDeals } from "@/components/shop/AmazingDeals";
import { HomeBannerCarousel } from "@/components/shop/HomeBannerCarousel";
import { HomeCategoryCircles } from "@/components/shop/HomeCategoryCircles";
import { HomePromoBanner } from "@/components/shop/HomePromoBanner";
import { ProductRail } from "@/components/shop/ProductRail";
import { TrustStrip } from "@/components/shop/TrustStrip";

import type { PuckComponents, PuckMetadata, PuckRootProps } from "./types";

function meta(puck: { metadata?: unknown }): PuckMetadata {
  return (puck.metadata as PuckMetadata) || {
    heroBanners: [],
    promoBanners: [],
    categories: [],
    productsLatest: [],
    productsAmazing: [],
  };
}

function asBool(v: unknown, fallback = false) {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "yes" || v === 1 || v === "1") return true;
  if (v === "false" || v === "no" || v === 0 || v === "0") return false;
  return fallback;
}

function pickProducts(m: PuckMetadata, source: string, count: number) {
  const pool = source === "amazing" ? m.productsAmazing : m.productsLatest;
  return (pool || []).slice(0, Math.max(1, count));
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="shop-container py-6">
      <div className="rounded-xl border border-dashed border-theme bg-card px-4 py-8 text-center text-sm text-muted">
        {children}
      </div>
    </div>
  );
}

function DefaultPromoSections() {
  return (
    <>
      <section className="shop-container pb-4 sm:pb-6">
        <div className="relative overflow-hidden rounded-2xl border border-theme bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div
            className="pointer-events-none absolute -end-16 -top-16 h-48 w-48 rounded-full bg-[var(--accent-soft)] blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-[var(--accent)]">سفارش عمده</p>
              <h2 className="mt-1.5 text-xl font-bold sm:text-2xl">تأمین لوازم خانگی برای پروژه‌ها</h2>
              <p className="mt-2 max-w-md text-sm text-muted">
                برای ساختمان، هتل و سازمان‌ها — قیمت پلکانی، گارانتی اصلی و پیش‌فاکتور رسمی.
              </p>
            </div>
            <Link
              href="/business"
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl border border-theme px-8 text-sm font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              سفارش عمده
            </Link>
          </div>
        </div>
      </section>
      <section className="shop-container pb-10 sm:pb-14">
        <div
          className="relative overflow-hidden rounded-2xl p-6 text-white sm:p-8"
          style={{
            background: "linear-gradient(120deg, var(--amazing-from), var(--amazing-to))",
          }}
        >
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-white/85">گارانتی اصلی</p>
              <h2 className="mt-1.5 text-xl font-bold sm:text-2xl">خرید مطمئن از فروشگاه دشتستان</h2>
              <p className="mt-2 max-w-md text-sm text-white/85">
                تمام محصولات با گارانتی معتبر، ارسال سریع و پشتیبانی تخصصی.
              </p>
            </div>
            <Link
              href="/catalog"
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-[var(--accent)] transition hover:bg-white/95"
            >
              مشاهده همه محصولات
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

const padY: Record<PuckRootProps["paddingY"], string> = {
  none: "",
  sm: "py-4",
  md: "py-8",
};

const spacerH: Record<"sm" | "md" | "lg" | "xl", string> = {
  sm: "h-4",
  md: "h-8",
  lg: "h-14",
  xl: "h-24",
};

const bannerH: Record<"sm" | "md" | "lg", string> = {
  sm: "h-32 sm:h-40",
  md: "h-44 sm:h-56",
  lg: "h-56 sm:h-72",
};

export const puckConfig: Config<PuckComponents, PuckRootProps> = {
  categories: {
    shop: {
      title: "فروشگاه",
      components: [
        "HeroCarousel",
        "TrustStrip",
        "AmazingDeals",
        "CategoryCircles",
        "ProductRail",
        "PromoBanners",
        "PromoCard",
      ],
      defaultExpanded: true,
    },
    layout: {
      title: "چیدمان",
      components: ["Heading", "Text", "Spacer", "ImageBanner", "CtaButton", "TwoColumns"],
    },
  },
  root: {
    label: "صفحه",
    fields: {
      title: { type: "text", label: "عنوان داخلی" },
      paddingY: {
        type: "select",
        label: "فاصله عمودی کل صفحه",
        options: [
          { label: "بدون فاصله", value: "none" },
          { label: "کم", value: "sm" },
          { label: "متوسط", value: "md" },
        ],
      },
    },
    defaultProps: {
      title: "صفحه اصلی",
      paddingY: "none",
    },
    render: ({ children, paddingY }) => (
      <div className={padY[paddingY] || ""}>{children}</div>
    ),
  },
  components: {
    HeroCarousel: {
      label: "اسلایدر بنر",
      fields: {
        autoplay: { type: "radio", label: "پخش خودکار", options: [
          { label: "بله", value: true },
          { label: "خیر", value: false },
        ]},
        intervalMs: {
          type: "number",
          label: "فاصله اسلاید (میلی‌ثانیه)",
          min: 2000,
          max: 15000,
        },
      },
      defaultProps: { autoplay: true, intervalMs: 5000 },
      render: ({ autoplay, intervalMs, puck }) => {
        const m = meta(puck);
        if (!m.heroBanners?.length) {
          return m.editing ? (
            <EmptyHint>بنر اسلایدر ندارید — از «بنرها» در ادمین اضافه کنید.</EmptyHint>
          ) : (
            <></>
          );
        }
        return (
          <HomeBannerCarousel
            banners={m.heroBanners}
            autoplay={asBool(autoplay, true)}
            intervalMs={Number(intervalMs) || 5000}
          />
        );
      },
    },
    TrustStrip: {
      label: "نوار اعتماد",
      fields: {},
      defaultProps: { _noop: false },
      render: () => <TrustStrip />,
    },
    AmazingDeals: {
      label: "پیشنهاد شگفت‌انگیز",
      fields: {
        title: { type: "text", label: "عنوان" },
        href: { type: "text", label: "لینک مشاهده همه" },
        productCount: { type: "number", label: "تعداد محصول", min: 4, max: 24 },
        source: {
          type: "select",
          label: "منبع محصولات",
          options: [
            { label: "لیست محصولات (کامل)", value: "latest" },
            { label: "ریل شگفت (۱۰تای اول)", value: "amazing" },
          ],
        },
      },
      defaultProps: {
        title: "پیشنهاد شگفت‌انگیز",
        href: "/catalog",
        productCount: 10,
        source: "amazing",
      },
      render: ({ title, href, productCount, source, puck }) => {
        const products = pickProducts(meta(puck), source, productCount);
        if (!products.length) {
          return meta(puck).editing ? <EmptyHint>محصولی برای شگفت‌انگیز نیست.</EmptyHint> : <></>;
        }
        return <AmazingDeals products={products} title={title} href={href || "/catalog"} />;
      },
    },
    CategoryCircles: {
      label: "دسته‌های دایره‌ای",
      fields: {
        title: { type: "text", label: "عنوان" },
        limit: { type: "number", label: "تعداد", min: 4, max: 24 },
        href: { type: "text", label: "لینک «همه»" },
      },
      defaultProps: { title: "دسته‌بندی‌ها", limit: 12, href: "/browse" },
      render: ({ title, limit, href, puck }) => {
        const cats = meta(puck).categories || [];
        if (!cats.length) {
          return meta(puck).editing ? <EmptyHint>دسته‌ای برای نمایش نیست.</EmptyHint> : <></>;
        }
        return (
          <HomeCategoryCircles
            categories={cats}
            title={title}
            limit={limit || 12}
            href={href || "/browse"}
          />
        );
      },
    },
    ProductRail: {
      label: "ریل محصولات",
      fields: {
        title: { type: "text", label: "عنوان" },
        subtitle: { type: "text", label: "زیرعنوان" },
        href: { type: "text", label: "لینک" },
        hrefLabel: { type: "text", label: "متن لینک" },
        productCount: { type: "number", label: "تعداد", min: 4, max: 24 },
        source: {
          type: "select",
          label: "منبع",
          options: [
            { label: "لیست محصولات (کامل)", value: "latest" },
            { label: "ریل شگفت (۱۰تای اول)", value: "amazing" },
          ],
        },
      },
      defaultProps: {
        title: "پرفروش‌ترین‌ها",
        subtitle: "محصولات منتخب",
        href: "/catalog",
        hrefLabel: "مشاهده همه",
        productCount: 12,
        source: "latest",
      },
      render: ({ title, subtitle, href, hrefLabel, productCount, source, puck }) => {
        const products = pickProducts(meta(puck), source, productCount);
        if (!products.length) {
          return meta(puck).editing ? <EmptyHint>محصولی برای ریل نیست.</EmptyHint> : <></>;
        }
        return (
          <ProductRail
            title={title}
            subtitle={subtitle}
            products={products}
            href={href || "/catalog"}
            hrefLabel={hrefLabel || "مشاهده همه"}
          />
        );
      },
    },
    PromoBanners: {
      label: "بنرهای تبلیغاتی",
      fields: {
        showFallback: {
          type: "radio",
          label: "نمایش بنر پیش‌فرض اگر خالی بود",
          options: [
            { label: "بله", value: true },
            { label: "خیر", value: false },
          ],
        },
      },
      defaultProps: { showFallback: true },
      render: ({ showFallback, puck }) => {
        const banners = meta(puck).promoBanners || [];
        if (banners.length) {
          return (
            <>
              {banners.map((b) => (
                <HomePromoBanner key={b.id} banner={b} />
              ))}
            </>
          );
        }
        if (asBool(showFallback, true)) return <DefaultPromoSections />;
        return meta(puck).editing ? (
          <EmptyHint>بنر تبلیغاتی ندارید — از بخش بنرها اضافه کنید یا fallback را روشن بگذارید.</EmptyHint>
        ) : (
          <></>
        );
      },
    },
    PromoCard: {
      label: "کارت تبلیغاتی سفارشی",
      fields: {
        eyebrow: { type: "text", label: "برچسب کوچک" },
        title: { type: "text", label: "عنوان" },
        subtitle: { type: "textarea", label: "توضیح" },
        ctaLabel: { type: "text", label: "متن دکمه" },
        ctaHref: { type: "text", label: "لینک دکمه" },
        style: {
          type: "radio",
          label: "استایل",
          options: [
            { label: "کارت روشن", value: "card" },
            { label: "گرادیان نارنجی", value: "gradient" },
          ],
        },
      },
      defaultProps: {
        eyebrow: "ویژه",
        title: "عنوان کارت",
        subtitle: "توضیح کوتاه درباره پیشنهاد",
        ctaLabel: "مشاهده",
        ctaHref: "/catalog",
        style: "gradient",
      },
      render: ({ eyebrow, title, subtitle, ctaLabel, ctaHref, style }) => {
        const isGrad = style === "gradient";
        return (
          <section className="shop-container pb-4 sm:pb-6">
            <div
              className={
                isGrad
                  ? "relative overflow-hidden rounded-2xl p-6 text-white sm:p-8"
                  : "relative overflow-hidden rounded-2xl border border-theme bg-card p-6 shadow-[var(--shadow-card)] sm:p-8"
              }
              style={
                isGrad
                  ? { background: "linear-gradient(120deg, var(--amazing-from), var(--amazing-to))" }
                  : undefined
              }
            >
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {eyebrow ? (
                    <p
                      className={
                        isGrad
                          ? "text-xs font-semibold tracking-wide text-white/85"
                          : "text-xs font-semibold tracking-wide text-[var(--accent)]"
                      }
                    >
                      {eyebrow}
                    </p>
                  ) : null}
                  <h2 className="mt-1.5 text-xl font-bold sm:text-2xl">{title}</h2>
                  {subtitle ? (
                    <p className={`mt-2 max-w-md text-sm ${isGrad ? "text-white/85" : "text-muted"}`}>
                      {subtitle}
                    </p>
                  ) : null}
                </div>
                {ctaLabel && ctaHref ? (
                  <Link
                    href={ctaHref}
                    className={
                      isGrad
                        ? "inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-[var(--accent)]"
                        : "inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl border border-theme px-8 text-sm font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    }
                  >
                    {ctaLabel}
                  </Link>
                ) : null}
              </div>
            </div>
          </section>
        );
      },
    },
    Heading: {
      label: "عنوان",
      fields: {
        text: { type: "text", label: "متن" },
        level: {
          type: "select",
          label: "سطح",
          options: [
            { label: "H1", value: "h1" },
            { label: "H2", value: "h2" },
            { label: "H3", value: "h3" },
          ],
        },
        align: {
          type: "radio",
          label: "تراز",
          options: [
            { label: "راست", value: "start" },
            { label: "وسط", value: "center" },
          ],
        },
      },
      defaultProps: { text: "عنوان بخش", level: "h2", align: "start" },
      render: ({ text, level, align }) => {
        const alignCls = align === "center" ? "text-center" : "text-start";
        const safeLevel = level === "h1" || level === "h3" ? level : "h2";
        const cls =
          safeLevel === "h1"
            ? "text-2xl font-bold sm:text-3xl"
            : safeLevel === "h3"
              ? "text-base font-bold sm:text-lg"
              : "text-lg font-bold sm:text-xl";
        const Tag = safeLevel;
        return (
          <div className={`shop-container py-3 ${alignCls}`}>
            <Tag className={cls}>{text}</Tag>
          </div>
        );
      },
    },
    Text: {
      label: "متن",
      fields: {
        text: { type: "textarea", label: "متن" },
        align: {
          type: "radio",
          label: "تراز",
          options: [
            { label: "راست", value: "start" },
            { label: "وسط", value: "center" },
          ],
        },
      },
      defaultProps: { text: "توضیح کوتاه این بخش…", align: "start" },
      render: ({ text, align }) => (
        <div className={`shop-container py-2 ${align === "center" ? "text-center" : "text-start"}`}>
          <p className="max-w-2xl text-sm text-muted sm:text-base">{text}</p>
        </div>
      ),
    },
    Spacer: {
      label: "فاصله‌گذار",
      fields: {
        size: {
          type: "select",
          label: "ارتفاع",
          options: [
            { label: "کم", value: "sm" },
            { label: "متوسط", value: "md" },
            { label: "زیاد", value: "lg" },
            { label: "خیلی زیاد", value: "xl" },
          ],
        },
      },
      defaultProps: { size: "md" },
      render: ({ size }) => <div className={spacerH[size] || spacerH.md} aria-hidden />,
    },
    ImageBanner: {
      label: "بنر تصویری",
      fields: {
        imageUrl: { type: "text", label: "آدرس تصویر" },
        href: { type: "text", label: "لینک" },
        alt: { type: "text", label: "متن جایگزین" },
        height: {
          type: "select",
          label: "ارتفاع",
          options: [
            { label: "کم", value: "sm" },
            { label: "متوسط", value: "md" },
            { label: "زیاد", value: "lg" },
          ],
        },
        rounded: {
          type: "radio",
          label: "گوشه گرد",
          options: [
            { label: "بله", value: true },
            { label: "خیر", value: false },
          ],
        },
      },
      defaultProps: {
        imageUrl: "",
        href: "/catalog",
        alt: "بنر",
        height: "md",
        rounded: true,
      },
      render: ({ imageUrl, href, alt, height, rounded, puck }) => {
        if (!imageUrl) {
          return meta(puck).editing ? (
            <EmptyHint>آدرس تصویر را در تنظیمات بلوک وارد کنید.</EmptyHint>
          ) : (
            <></>
          );
        }
        const inner = (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={alt || "بنر"}
            className={`w-full object-cover ${bannerH[height] || bannerH.md} ${asBool(rounded, true) ? "rounded-2xl" : ""}`}
          />
        );
        return (
          <section className="shop-container py-3">
            {href ? (
              <Link href={href} className="block overflow-hidden">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </section>
        );
      },
    },
    CtaButton: {
      label: "دکمه CTA",
      fields: {
        label: { type: "text", label: "متن" },
        href: { type: "text", label: "لینک" },
        variant: {
          type: "radio",
          label: "نوع",
          options: [
            { label: "اصلی", value: "primary" },
            { label: "حاشیه‌دار", value: "outline" },
          ],
        },
        fullWidth: {
          type: "radio",
          label: "تمام‌عرض",
          options: [
            { label: "بله", value: true },
            { label: "خیر", value: false },
          ],
        },
      },
      defaultProps: {
        label: "ورود به فروشگاه",
        href: "/catalog",
        variant: "primary",
        fullWidth: true,
      },
      render: ({ label, href, variant, fullWidth }) => {
        const wide = asBool(fullWidth, true);
        return (
          <section className="shop-container py-4">
            <Link
              href={href || "/catalog"}
              className={
                variant === "outline"
                  ? `inline-flex min-h-12 items-center justify-center rounded-xl border border-theme px-8 text-sm font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] ${wide ? "w-full" : ""}`
                  : `inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--accent)] px-8 text-sm font-bold text-[var(--accent-fg)] hover:opacity-90 ${wide ? "w-full" : ""}`
              }
            >
              {label}
            </Link>
          </section>
        );
      },
    },
    TwoColumns: {
      label: "دو ستون",
      fields: {
        gap: {
          type: "select",
          label: "فاصله",
          options: [
            { label: "کم", value: "sm" },
            { label: "متوسط", value: "md" },
            { label: "زیاد", value: "lg" },
          ],
        },
      },
      defaultProps: { gap: "md" },
      render: ({ gap }) => {
        const g = gap === "sm" ? "gap-3" : gap === "lg" ? "gap-8" : "gap-5";
        return (
          <section className={`shop-container grid grid-cols-1 py-3 md:grid-cols-2 ${g}`}>
            <DropZone zone="left" />
            <DropZone zone="right" />
          </section>
        );
      },
    },
  },
};

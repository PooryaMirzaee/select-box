// @ts-nocheck — Puck render props are loosely typed when merging extraBlocks
"use client";

import Link from "next/link";
import type { Config } from "@puckeditor/core";
import { DropZone } from "@puckeditor/core";

import { AmazingDeals } from "@/components/shop/AmazingDeals";
import { HomeBannerCarousel } from "@/components/shop/HomeBannerCarousel";
import { HomeCategoryCircles } from "@/components/shop/HomeCategoryCircles";
import { HomePromoBanner } from "@/components/shop/HomePromoBanner";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductRail } from "@/components/shop/ProductRail";
import { TrustStrip } from "@/components/shop/TrustStrip";
import type { HomeBanner } from "@/lib/home-banners";
import type { ProductSummary } from "@/lib/api";

import { extraBlocks } from "./blocks/extra";
import {
  asBool,
  bannerH,
  EmptyHint,
  gapCls,
  meta,
  pickProducts,
  SOURCE_MODE_FIELD,
  spacerH,
} from "./helpers";
import {
  BlockShell,
  chromeDefaults,
  sanitizeCss,
  scopeCss,
  StyleFieldTabs,
  withChromeFields,
  SCHEMA_VERSION,
} from "./style";
import type { PuckComponents, PuckRootProps } from "./types";

function DefaultPromoSections() {
  return (
    <>
      <section className="shop-container pb-4 sm:pb-6">
        <div className="relative overflow-hidden rounded-2xl border border-theme bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
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

function manualToProducts(items: { title: string; price: string; imageUrl: string; href: string }[]): ProductSummary[] {
  return (items || []).map((it, i) => {
    const slug = (it.href || "").replace(/^\/product\//, "") || `manual-${i}`;
    return {
      id: -(i + 1),
      title: it.title,
      slug,
      base_price: String(it.price || "0").replace(/[^\d.]/g, "") || "0",
      status: "active",
      design_id: 0,
      parent_category_slug: null,
      image_url: it.imageUrl || null,
    };
  });
}

function slidesToBanners(
  slides: { imageUrl: string; href: string; title: string; subtitle?: string }[],
): HomeBanner[] {
  return (slides || [])
    .filter((s) => s.imageUrl)
    .map((s, i) => ({
      id: -(i + 1),
      title_fa: s.title || null,
      subtitle_fa: s.subtitle || null,
      eyebrow_fa: null,
      cta_label: null,
      cta_href: s.href || "/catalog",
      image_url: s.imageUrl,
      image_mobile_url: s.imageUrl,
      placement: "hero" as const,
      variant: "image" as const,
      text_align: "start" as const,
      overlay_opacity: 0.35,
      accent_style: "default" as const,
      sort_order: i,
      open_in_new_tab: false,
    }));
}

const padY: Record<PuckRootProps["paddingY"], string> = {
  none: "",
  sm: "py-4",
  md: "py-8",
};

const DEFAULT_TRUST = [
  { title: "ارسال سریع", desc: "به سراسر کشور", icon: "truck" },
  { title: "ضمانت اصالت", desc: "کالای اورجینال", icon: "shield" },
  { title: "پرداخت امن", desc: "درگاه معتبر", icon: "card" },
  { title: "پشتیبانی", desc: "پاسخگویی سریع", icon: "headset" },
];

const puckCategories: Config<PuckComponents, PuckRootProps>["categories"] = {
    shop: {
      title: "فروشگاه",
      components: [
        "HeroCarousel",
        "HeroBanner",
        "AnnouncementBar",
        "TrustStrip",
        "AmazingDeals",
        "CategoryCircles",
        "CategoryCards",
        "ProductRail",
        "ProductGrid",
        "PromoBanners",
        "PromoCard",
        "CountdownDeal",
        "SearchCta",
        "PricingCards",
        "BrandLogos",
        "NewsletterCta",
        "StickyCta",
      ],
      defaultExpanded: true,
    },
    marketing: {
      title: "بازاریابی",
      components: [
        "FaqList",
        "FeaturesGrid",
        "StatsRow",
        "Testimonials",
        "StepsProcess",
        "Accordion",
        "Callout",
        "Marquee",
        "SocialLinks",
        "ContactInfo",
        "MapEmbed",
      ],
    },
    layout: {
      title: "چیدمان",
      components: [
        "Section",
        "Container",
        "Columns",
        "Grid",
        "Stack",
        "Card",
        "TwoColumns",
        "Spacer",
        "Divider",
        "SeparatorLabel",
      ],
    },
    content: {
      title: "محتوا",
      components: [
        "Heading",
        "Paragraph",
        "Text",
        "RichText",
        "BulletList",
        "OrderedList",
        "Image",
        "ImageBanner",
        "Gallery",
        "VideoEmbed",
        "Icon",
        "LogoLockup",
        "CtaButton",
        "ButtonGroup",
        "Badge",
        "Quote",
        "LinkList",
        "DataTable",
        "HtmlEmbed",
        "CustomCode",
      ],
    },
};

export const puckConfig = {
  categories: puckCategories,
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
      pageBg: { type: "text", label: "پس‌زمینه صفحه" },
      pageCustomCss: {
        type: "textarea",
        label: "CSS سفارشی صفحه (با scope خودکار)",
      },
      seoTitle: { type: "text", label: "SEO عنوان" },
      seoDescription: { type: "textarea", label: "SEO توضیحات" },
      schemaVersion: {
        type: "number",
        label: "نسخه schema (خودکار)",
        min: SCHEMA_VERSION,
        max: SCHEMA_VERSION,
      },
    },
    defaultProps: {
      title: "صفحه اصلی",
      paddingY: "none",
      pageBg: "",
      pageCustomCss: "",
      seoTitle: "",
      seoDescription: "",
      schemaVersion: SCHEMA_VERSION,
    },
    render: ({ children, paddingY, pageBg, pageCustomCss }) => {
      // CSS صفحه در PuckHome / ادیتور با scope slug اعمال می‌شود
      const css = pageCustomCss ? sanitizeCss(pageCustomCss) : "";
      return (
        <div
          className={`puck-page-root ${padY[paddingY] || ""}`}
          style={pageBg ? { background: pageBg } : undefined}
          data-page-css={css ? "1" : undefined}
        >
          {children}
          {css ? (
            <style
              dangerouslySetInnerHTML={{
                __html: scopeCss(".puck-page-root", css),
              }}
            />
          ) : null}
        </div>
      );
    },
  },
  components: {
    HeroCarousel: {
      label: "اسلایدر بنر",
      fields: withChromeFields({
        sourceMode: SOURCE_MODE_FIELD,
        autoplay: {
          type: "radio",
          label: "پخش خودکار",
          options: [
            { label: "بله", value: true },
            { label: "خیر", value: false },
          ],
        },
        intervalMs: {
          type: "number",
          label: "فاصله اسلاید (میلی‌ثانیه)",
          min: 2000,
          max: 15000,
        },
        slides: {
          type: "array",
          label: "اسلایدهای دستی",
          getItemSummary: (item: { title?: string }) => item.title || "اسلاید",
          arrayFields: {
            imageUrl: { type: "text", label: "تصویر" },
            href: { type: "text", label: "لینک" },
            title: { type: "text", label: "عنوان" },
            subtitle: { type: "text", label: "زیرعنوان" },
          },
          defaultItemProps: {
            imageUrl: "",
            href: "/catalog",
            title: "اسلاید",
            subtitle: "",
          },
        },
      }),
      defaultProps: {
        ...chromeDefaults({ widthMode: "full", padT: "", padB: "" }),
        sourceMode: "live",
        autoplay: true,
        intervalMs: 5000,
        slides: [],
      },
      renderFields: ({ fields }) => (
        <StyleFieldTabs
          fields={fields}
          content={["sourceMode", "autoplay", "intervalMs", "slides"]}
        />
      ),
      render: ({ sourceMode, autoplay, intervalMs, slides, puck, id, ...chrome }) => {
        const m = meta(puck);
        const banners =
          sourceMode === "manual" && slides?.length
            ? slidesToBanners(slides)
            : m.heroBanners;
        if (!banners?.length) {
          return m.editing ? (
            <EmptyHint>بنر اسلایدر ندارید — از «بنرها» یا حالت دستی اضافه کنید.</EmptyHint>
          ) : (
            <></>
          );
        }
        return (
          <BlockShell id={id} chrome={chrome}>
            <HomeBannerCarousel
              banners={banners}
              autoplay={asBool(autoplay, true)}
              intervalMs={Number(intervalMs) || 5000}
            />
          </BlockShell>
        );
      },
    },
    TrustStrip: {
      label: "نوار اعتماد",
      fields: withChromeFields({
        items: {
          type: "array",
          label: "آیتم‌ها",
          getItemSummary: (item: { title?: string }) => item.title || "آیتم",
          arrayFields: {
            title: { type: "text", label: "عنوان" },
            desc: { type: "text", label: "توضیح" },
            icon: {
              type: "select",
              label: "آیکون",
              options: [
                { label: "ارسال", value: "truck" },
                { label: "ضمانت", value: "shield" },
                { label: "پرداخت", value: "card" },
                { label: "پشتیبانی", value: "headset" },
              ],
            },
          },
          defaultItemProps: { title: "عنوان", desc: "توضیح", icon: "truck" },
        },
      }),
      defaultProps: {
        ...chromeDefaults({ widthMode: "full" }),
        items: DEFAULT_TRUST,
      },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["items"]} />,
      render: ({ items, id, ...chrome }) => (
        <BlockShell id={id} chrome={chrome}>
          <TrustStrip items={items?.length ? items : DEFAULT_TRUST} />
        </BlockShell>
      ),
    },
    AmazingDeals: {
      label: "پیشنهاد شگفت‌انگیز",
      fields: withChromeFields({
        sourceMode: SOURCE_MODE_FIELD,
        title: { type: "text", label: "عنوان" },
        href: { type: "text", label: "لینک مشاهده همه" },
        productCount: { type: "number", label: "تعداد محصول", min: 4, max: 24 },
        source: {
          type: "select",
          label: "منبع محصولات زنده",
          options: [
            { label: "لیست محصولات", value: "latest" },
            { label: "ریل شگفت", value: "amazing" },
          ],
        },
        manualProducts: {
          type: "array",
          label: "محصولات دستی",
          getItemSummary: (item: { title?: string }) => item.title || "محصول",
          arrayFields: {
            title: { type: "text", label: "عنوان" },
            price: { type: "text", label: "قیمت" },
            imageUrl: { type: "text", label: "تصویر" },
            href: { type: "text", label: "لینک" },
          },
          defaultItemProps: {
            title: "محصول",
            price: "0",
            imageUrl: "",
            href: "/catalog",
          },
        },
      }),
      defaultProps: {
        ...chromeDefaults({ widthMode: "full" }),
        sourceMode: "live",
        title: "پیشنهاد شگفت‌انگیز",
        href: "/catalog",
        productCount: 10,
        source: "amazing",
        manualProducts: [],
      },
      renderFields: ({ fields }) => (
        <StyleFieldTabs
          fields={fields}
          content={[
            "sourceMode",
            "title",
            "href",
            "productCount",
            "source",
            "manualProducts",
          ]}
        />
      ),
      render: ({
        sourceMode,
        title,
        href,
        productCount,
        source,
        manualProducts,
        puck,
        id,
        ...chrome
      }) => {
        const products =
          sourceMode === "manual" && manualProducts?.length
            ? manualToProducts(manualProducts)
            : pickProducts(meta(puck), source, productCount);
        if (!products.length) {
          return meta(puck).editing ? (
            <EmptyHint>محصولی برای شگفت‌انگیز نیست.</EmptyHint>
          ) : (
            <></>
          );
        }
        return (
          <BlockShell id={id} chrome={chrome}>
            <AmazingDeals products={products} title={title} href={href || "/catalog"} />
          </BlockShell>
        );
      },
    },
    CategoryCircles: {
      label: "دسته‌های دایره‌ای",
      fields: withChromeFields({
        sourceMode: SOURCE_MODE_FIELD,
        title: { type: "text", label: "عنوان" },
        limit: { type: "number", label: "تعداد", min: 4, max: 24 },
        href: { type: "text", label: "لینک «همه»" },
        manualCategories: {
          type: "array",
          label: "دسته‌های دستی",
          getItemSummary: (item: { title?: string }) => item.title || "دسته",
          arrayFields: {
            title: { type: "text", label: "عنوان" },
            imageUrl: { type: "text", label: "تصویر" },
            href: { type: "text", label: "لینک" },
          },
          defaultItemProps: { title: "دسته", imageUrl: "", href: "/browse" },
        },
      }),
      defaultProps: {
        ...chromeDefaults({ widthMode: "full" }),
        sourceMode: "live",
        title: "دسته‌بندی‌ها",
        limit: 12,
        href: "/browse",
        manualCategories: [],
      },
      renderFields: ({ fields }) => (
        <StyleFieldTabs
          fields={fields}
          content={["sourceMode", "title", "limit", "href", "manualCategories"]}
        />
      ),
      render: ({
        sourceMode,
        title,
        limit,
        href,
        manualCategories,
        puck,
        id,
        ...chrome
      }) => {
        const live = meta(puck).categories || [];
        const cats =
          sourceMode === "manual" && manualCategories?.length
            ? manualCategories.map((c, i) => ({
                id: -(i + 1),
                name_fa: c.title,
                slug: c.href?.replace(/^\/browse\/?/, "") || `cat-${i}`,
                path: c.href || `/browse/cat-${i}`,
                image_url: c.imageUrl || null,
              }))
            : live;
        if (!cats.length) {
          return meta(puck).editing ? (
            <EmptyHint>دسته‌ای برای نمایش نیست.</EmptyHint>
          ) : (
            <></>
          );
        }
        return (
          <BlockShell id={id} chrome={chrome}>
            <HomeCategoryCircles
              categories={cats}
              title={title}
              limit={limit || 12}
              href={href || "/browse"}
            />
          </BlockShell>
        );
      },
    },
    ProductRail: {
      label: "ریل محصولات",
      fields: withChromeFields({
        sourceMode: SOURCE_MODE_FIELD,
        title: { type: "text", label: "عنوان" },
        subtitle: { type: "text", label: "زیرعنوان" },
        href: { type: "text", label: "لینک" },
        hrefLabel: { type: "text", label: "متن لینک" },
        productCount: { type: "number", label: "تعداد", min: 4, max: 24 },
        source: {
          type: "select",
          label: "منبع زنده",
          options: [
            { label: "لیست محصولات", value: "latest" },
            { label: "ریل شگفت", value: "amazing" },
          ],
        },
        manualProducts: {
          type: "array",
          label: "محصولات دستی",
          getItemSummary: (item: { title?: string }) => item.title || "محصول",
          arrayFields: {
            title: { type: "text", label: "عنوان" },
            price: { type: "text", label: "قیمت" },
            imageUrl: { type: "text", label: "تصویر" },
            href: { type: "text", label: "لینک" },
          },
          defaultItemProps: {
            title: "محصول",
            price: "0",
            imageUrl: "",
            href: "/catalog",
          },
        },
      }),
      defaultProps: {
        ...chromeDefaults({ widthMode: "full" }),
        sourceMode: "live",
        title: "پرفروش‌ترین‌ها",
        subtitle: "محصولات منتخب",
        href: "/catalog",
        hrefLabel: "مشاهده همه",
        productCount: 12,
        source: "latest",
        manualProducts: [],
      },
      renderFields: ({ fields }) => (
        <StyleFieldTabs
          fields={fields}
          content={[
            "sourceMode",
            "title",
            "subtitle",
            "href",
            "hrefLabel",
            "productCount",
            "source",
            "manualProducts",
          ]}
        />
      ),
      render: ({
        sourceMode,
        title,
        subtitle,
        href,
        hrefLabel,
        productCount,
        source,
        manualProducts,
        puck,
        id,
        ...chrome
      }) => {
        const products =
          sourceMode === "manual" && manualProducts?.length
            ? manualToProducts(manualProducts)
            : pickProducts(meta(puck), source, productCount);
        if (!products.length) {
          return meta(puck).editing ? (
            <EmptyHint>محصولی برای ریل نیست.</EmptyHint>
          ) : (
            <></>
          );
        }
        return (
          <BlockShell id={id} chrome={chrome}>
            <ProductRail
              title={title}
              subtitle={subtitle}
              products={products}
              href={href || "/catalog"}
              hrefLabel={hrefLabel || "مشاهده همه"}
            />
          </BlockShell>
        );
      },
    },
    ProductGrid: {
      label: "شبکه محصولات",
      fields: withChromeFields({
        sourceMode: SOURCE_MODE_FIELD,
        title: { type: "text", label: "عنوان" },
        href: { type: "text", label: "لینک" },
        hrefLabel: { type: "text", label: "متن لینک" },
        productCount: { type: "number", label: "تعداد", min: 4, max: 24 },
        source: {
          type: "select",
          label: "منبع زنده",
          options: [
            { label: "لیست محصولات", value: "latest" },
            { label: "ریل شگفت", value: "amazing" },
          ],
        },
        columns: {
          type: "radio",
          label: "ستون‌ها",
          options: [
            { label: "۲", value: "2" },
            { label: "۳", value: "3" },
            { label: "۴", value: "4" },
          ],
        },
        manualProducts: {
          type: "array",
          label: "محصولات دستی",
          getItemSummary: (item: { title?: string }) => item.title || "محصول",
          arrayFields: {
            title: { type: "text", label: "عنوان" },
            price: { type: "text", label: "قیمت" },
            imageUrl: { type: "text", label: "تصویر" },
            href: { type: "text", label: "لینک" },
          },
          defaultItemProps: {
            title: "محصول",
            price: "0",
            imageUrl: "",
            href: "/catalog",
          },
        },
      }),
      defaultProps: {
        ...chromeDefaults(),
        sourceMode: "live",
        title: "محصولات",
        href: "/catalog",
        hrefLabel: "مشاهده همه",
        productCount: 8,
        source: "latest",
        columns: "4",
        manualProducts: [],
      },
      renderFields: ({ fields }) => (
        <StyleFieldTabs
          fields={fields}
          content={[
            "sourceMode",
            "title",
            "href",
            "hrefLabel",
            "productCount",
            "source",
            "columns",
            "manualProducts",
          ]}
        />
      ),
      render: ({
        sourceMode,
        title,
        href,
        hrefLabel,
        productCount,
        source,
        columns,
        manualProducts,
        puck,
        id,
        ...chrome
      }) => {
        const products =
          sourceMode === "manual" && manualProducts?.length
            ? manualToProducts(manualProducts)
            : pickProducts(meta(puck), source, productCount);
        if (!products.length) {
          return meta(puck).editing ? (
            <EmptyHint>محصولی برای شبکه نیست.</EmptyHint>
          ) : (
            <></>
          );
        }
        const cols =
          columns === "2"
            ? "grid-cols-2 md:grid-cols-2"
            : columns === "3"
              ? "grid-cols-2 md:grid-cols-3"
              : "grid-cols-2 md:grid-cols-4";
        return (
          <BlockShell id={id} chrome={chrome} className="py-4">
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
              {href ? (
                <Link href={href} className="text-sm text-[var(--accent)]">
                  {hrefLabel || "مشاهده همه"}
                </Link>
              ) : null}
            </div>
            <div className={`grid ${cols} gap-3 sm:gap-4`}>
              {products.map((p, i) => (
                <ProductCard key={p.id ?? i} product={p} index={i} />
              ))}
            </div>
          </BlockShell>
        );
      },
    },
    PromoBanners: {
      label: "بنرهای تبلیغاتی",
      fields: withChromeFields({
        sourceMode: SOURCE_MODE_FIELD,
        showFallback: {
          type: "radio",
          label: "نمایش بنر پیش‌فرض اگر خالی بود",
          options: [
            { label: "بله", value: true },
            { label: "خیر", value: false },
          ],
        },
      }),
      defaultProps: {
        ...chromeDefaults({ widthMode: "full" }),
        sourceMode: "live",
        showFallback: true,
      },
      renderFields: ({ fields }) => (
        <StyleFieldTabs fields={fields} content={["sourceMode", "showFallback"]} />
      ),
      render: ({ showFallback, puck, id, ...chrome }) => {
        const banners = meta(puck).promoBanners || [];
        if (banners.length) {
          return (
            <BlockShell id={id} chrome={chrome}>
              {banners.map((b) => (
                <HomePromoBanner key={b.id} banner={b} />
              ))}
            </BlockShell>
          );
        }
        if (asBool(showFallback, true)) {
          return (
            <BlockShell id={id} chrome={chrome}>
              <DefaultPromoSections />
            </BlockShell>
          );
        }
        return meta(puck).editing ? (
          <EmptyHint>بنر تبلیغاتی ندارید.</EmptyHint>
        ) : (
          <></>
        );
      },
    },
    PromoCard: {
      label: "کارت تبلیغاتی سفارشی",
      fields: withChromeFields({
        eyebrow: { type: "text", label: "برچسب کوچک" },
        title: { type: "text", label: "عنوان" },
        subtitle: { type: "textarea", label: "توضیح" },
        ctaLabel: { type: "text", label: "متن دکمه" },
        ctaHref: { type: "text", label: "لینک دکمه" },
        cardStyle: {
          type: "radio",
          label: "استایل",
          options: [
            { label: "کارت روشن", value: "card" },
            { label: "گرادیان نارنجی", value: "gradient" },
          ],
        },
      }),
      defaultProps: {
        ...chromeDefaults(),
        eyebrow: "ویژه",
        title: "عنوان کارت",
        subtitle: "توضیح کوتاه درباره پیشنهاد",
        ctaLabel: "مشاهده",
        ctaHref: "/catalog",
        cardStyle: "gradient",
      },
      renderFields: ({ fields }) => (
        <StyleFieldTabs
          fields={fields}
          content={["eyebrow", "title", "subtitle", "ctaLabel", "ctaHref", "cardStyle"]}
        />
      ),
      render: (props) => {
        const {
          eyebrow,
          title,
          subtitle,
          ctaLabel,
          ctaHref,
          cardStyle,
          id,
          ...chrome
        } = props;
        const legacyStyle = (props as { style?: string }).style;
        const isGrad = cardStyle === "gradient" || legacyStyle === "gradient";
        return (
          <BlockShell id={id} chrome={chrome} as="section" className="pb-4 sm:pb-6">
            <div
              className={
                isGrad
                  ? "relative overflow-hidden rounded-2xl p-6 text-white sm:p-8"
                  : "relative overflow-hidden rounded-2xl border border-theme bg-card p-6 shadow-[var(--shadow-card)] sm:p-8"
              }
              style={
                isGrad
                  ? {
                      background:
                        "linear-gradient(120deg, var(--amazing-from), var(--amazing-to))",
                    }
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
          </BlockShell>
        );
      },
    },
    FaqList: {
      label: "سوالات متداول",
      fields: withChromeFields({
        title: { type: "text", label: "عنوان بخش" },
        items: {
          type: "array",
          label: "سوالات",
          getItemSummary: (item: { question?: string }) => item.question || "سوال",
          arrayFields: {
            question: { type: "text", label: "سوال" },
            answer: { type: "textarea", label: "پاسخ" },
          },
          defaultItemProps: { question: "سوال؟", answer: "پاسخ…" },
        },
      }),
      defaultProps: {
        ...chromeDefaults(),
        title: "سوالات متداول",
        items: [
          { question: "هزینه ارسال چقدر است؟", answer: "بسته به شهر و وزن متفاوت است." },
          { question: "گارانتی دارید؟", answer: "بله، گارانتی اصلی سازنده." },
        ],
      },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["title", "items"]} />,
      render: ({ title, items, id, ...chrome }) => (
        <BlockShell id={id} chrome={chrome} as="section" className="py-6">
          {title ? <h2 className="mb-4 text-lg font-bold sm:text-xl">{title}</h2> : null}
          <div className="space-y-2">
            {(items || []).map((it, i) => (
              <details
                key={i}
                className="rounded-xl border border-theme bg-card px-4 py-3"
              >
                <summary className="cursor-pointer font-semibold">{it.question}</summary>
                <p className="mt-2 text-sm text-muted whitespace-pre-wrap">{it.answer}</p>
              </details>
            ))}
          </div>
        </BlockShell>
      ),
    },
    FeaturesGrid: {
      label: "ویژگی‌ها",
      fields: withChromeFields({
        title: { type: "text", label: "عنوان" },
        columns: {
          type: "radio",
          label: "ستون",
          options: [
            { label: "۲", value: "2" },
            { label: "۳", value: "3" },
            { label: "۴", value: "4" },
          ],
        },
        items: {
          type: "array",
          label: "آیتم‌ها",
          getItemSummary: (item: { title?: string }) => item.title || "ویژگی",
          arrayFields: {
            title: { type: "text", label: "عنوان" },
            desc: { type: "textarea", label: "توضیح" },
            icon: { type: "text", label: "آیکون (emoji یا متن)" },
          },
          defaultItemProps: { title: "ویژگی", desc: "", icon: "✓" },
        },
      }),
      defaultProps: {
        ...chromeDefaults(),
        title: "چرا ما؟",
        columns: "3",
        items: [
          { title: "ارسال سریع", desc: "به سراسر کشور", icon: "🚚" },
          { title: "ضمانت اصالت", desc: "کالای اورجینال", icon: "🛡️" },
          { title: "پشتیبانی", desc: "همیشه در کنار شما", icon: "💬" },
        ],
      },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["title", "columns", "items"]} />,
      render: ({ title, columns, items, id, ...chrome }) => {
        const cols =
          columns === "2"
            ? "md:grid-cols-2"
            : columns === "4"
              ? "md:grid-cols-4"
              : "md:grid-cols-3";
        return (
          <BlockShell id={id} chrome={chrome} as="section" className="py-6">
            {title ? <h2 className="mb-5 text-lg font-bold sm:text-xl">{title}</h2> : null}
            <div className={`grid grid-cols-1 gap-4 ${cols}`}>
              {(items || []).map((it, i) => (
                <div key={i} className="rounded-2xl border border-theme bg-card p-5">
                  {it.icon ? <div className="mb-2 text-2xl">{it.icon}</div> : null}
                  <h3 className="font-bold">{it.title}</h3>
                  {it.desc ? <p className="mt-1 text-sm text-muted">{it.desc}</p> : null}
                </div>
              ))}
            </div>
          </BlockShell>
        );
      },
    },
    BrandLogos: {
      label: "لوگوی برندها",
      fields: withChromeFields({
        title: { type: "text", label: "عنوان" },
        items: {
          type: "array",
          label: "برندها",
          getItemSummary: (item: { name?: string }) => item.name || "برند",
          arrayFields: {
            name: { type: "text", label: "نام" },
            imageUrl: { type: "text", label: "لوگو" },
            href: { type: "text", label: "لینک" },
          },
          defaultItemProps: { name: "برند", imageUrl: "", href: "" },
        },
      }),
      defaultProps: {
        ...chromeDefaults(),
        title: "برندها",
        items: [],
      },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["title", "items"]} />,
      render: ({ title, items, id, puck, ...chrome }) => {
        if (!items?.length) {
          return meta(puck).editing ? (
            <EmptyHint>برند اضافه کنید.</EmptyHint>
          ) : (
            <></>
          );
        }
        return (
          <BlockShell id={id} chrome={chrome} as="section" className="py-6">
            {title ? <h2 className="mb-4 text-lg font-bold">{title}</h2> : null}
            <div className="flex flex-wrap items-center justify-center gap-6">
              {items.map((b, i) => {
                const img = b.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.imageUrl} alt={b.name} className="h-10 w-auto object-contain opacity-80" />
                ) : (
                  <span className="text-sm font-semibold text-muted">{b.name}</span>
                );
                return b.href ? (
                  <Link key={i} href={b.href} className="opacity-90 hover:opacity-100">
                    {img}
                  </Link>
                ) : (
                  <div key={i}>{img}</div>
                );
              })}
            </div>
          </BlockShell>
        );
      },
    },
    NewsletterCta: {
      label: "خبرنامه",
      fields: withChromeFields({
        title: { type: "text", label: "عنوان" },
        subtitle: { type: "textarea", label: "توضیح" },
        placeholder: { type: "text", label: "placeholder ایمیل" },
        buttonLabel: { type: "text", label: "متن دکمه" },
        note: { type: "text", label: "یادداشت کوچک" },
      }),
      defaultProps: {
        ...chromeDefaults({
          bgGradient: "linear-gradient(120deg, var(--amazing-from), var(--amazing-to))",
          textColor: "#fff",
          borderRadius: "1rem",
          padT: "1.5rem",
          padB: "1.5rem",
          padR: "1.5rem",
          padL: "1.5rem",
        }),
        title: "از تخفیف‌ها باخبر شوید",
        subtitle: "ایمیل خود را وارد کنید.",
        placeholder: "you@example.com",
        buttonLabel: "عضویت",
        note: "بدون اسپم — فقط پیشنهادهای واقعی.",
      },
      renderFields: ({ fields }) => (
        <StyleFieldTabs
          fields={fields}
          content={["title", "subtitle", "placeholder", "buttonLabel", "note"]}
        />
      ),
      render: ({ title, subtitle, placeholder, buttonLabel, note, id, ...chrome }) => (
        <BlockShell id={id} chrome={chrome} as="section">
          <h2 className="text-xl font-bold">{title}</h2>
          {subtitle ? <p className="mt-2 text-sm opacity-90">{subtitle}</p> : null}
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              placeholder={placeholder}
              className="min-h-12 flex-1 rounded-xl border-0 px-4 text-[var(--fg)]"
              disabled
            />
            <button
              type="button"
              className="min-h-12 rounded-xl bg-white px-6 text-sm font-bold text-[var(--accent)]"
            >
              {buttonLabel}
            </button>
          </form>
          {note ? <p className="mt-2 text-xs opacity-80">{note}</p> : null}
        </BlockShell>
      ),
    },
    CountdownDeal: {
      label: "شمارش معکوس پیشنهاد",
      fields: withChromeFields({
        title: { type: "text", label: "عنوان" },
        subtitle: { type: "text", label: "زیرعنوان" },
        endsAt: { type: "text", label: "پایان (ISO یا YYYY-MM-DDTHH:mm)" },
        ctaLabel: { type: "text", label: "متن دکمه" },
        ctaHref: { type: "text", label: "لینک" },
      }),
      defaultProps: {
        ...chromeDefaults({
          bgColor: "var(--card)",
          borderWidth: "1px",
          borderColor: "var(--border)",
          borderRadius: "1rem",
          padT: "1.25rem",
          padB: "1.25rem",
          padR: "1.25rem",
          padL: "1.25rem",
          shadow: "card",
        }),
        title: "فرصت محدود",
        subtitle: "تا پایان پیشنهاد",
        endsAt: "",
        ctaLabel: "خرید کنید",
        ctaHref: "/catalog",
      },
      renderFields: ({ fields }) => (
        <StyleFieldTabs fields={fields} content={["title", "subtitle", "endsAt", "ctaLabel", "ctaHref"]} />
      ),
      render: ({ title, subtitle, endsAt, ctaLabel, ctaHref, id, ...chrome }) => {
        let label = "—";
        if (endsAt) {
          const end = new Date(endsAt).getTime();
          if (!Number.isNaN(end)) {
            const diff = Math.max(0, end - Date.now());
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            label = `${h}س ${m}د`;
          }
        }
        return (
          <BlockShell id={id} chrome={chrome} as="section">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">{title}</h2>
                {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
                <p className="mt-2 font-mono text-2xl font-bold text-[var(--accent)]">{label}</p>
              </div>
              {ctaLabel ? (
                <Link
                  href={ctaHref || "/catalog"}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--accent)] px-6 text-sm font-bold text-[var(--accent-fg)]"
                >
                  {ctaLabel}
                </Link>
              ) : null}
            </div>
          </BlockShell>
        );
      },
    },
    Section: {
      label: "سکشن",
      fields: withChromeFields({
        content: { type: "slot", label: "محتوای داخل سکشن" },
      }),
      defaultProps: {
        ...chromeDefaults({ widthMode: "full", padT: "1rem", padB: "1rem" }),
        content: [],
      },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["content"]} />,
      render: ({ content: Content, id, ...chrome }) => (
        <BlockShell id={id} chrome={chrome} as="section" className="relative">
          <Content />
        </BlockShell>
      ),
    },
    Container: {
      label: "کانتینر",
      fields: withChromeFields({
        content: { type: "slot", label: "محتوا" },
      }),
      defaultProps: {
        ...chromeDefaults({ widthMode: "container" }),
        content: [],
      },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["content"]} />,
      render: ({ content: Content, id, ...chrome }) => (
        <BlockShell id={id} chrome={{ ...chrome, widthMode: chrome.widthMode || "container" }}>
          <Content />
        </BlockShell>
      ),
    },
    Columns: {
      label: "ستون‌ها",
      fields: withChromeFields({
        columns: {
          type: "radio",
          label: "تعداد ستون",
          options: [
            { label: "۲", value: "2" },
            { label: "۳", value: "3" },
            { label: "۴", value: "4" },
          ],
        },
        colGap: {
          type: "select",
          label: "فاصله ستون",
          options: [
            { label: "کم", value: "sm" },
            { label: "متوسط", value: "md" },
            { label: "زیاد", value: "lg" },
          ],
        },
        col1: { type: "slot", label: "ستون ۱" },
        col2: { type: "slot", label: "ستون ۲" },
        col3: { type: "slot", label: "ستون ۳" },
        col4: { type: "slot", label: "ستون ۴" },
      }),
      defaultProps: {
        ...chromeDefaults(),
        columns: "2",
        colGap: "md",
        col1: [],
        col2: [],
        col3: [],
        col4: [],
      },
      renderFields: ({ fields }) => (
        <StyleFieldTabs fields={fields} content={["columns", "colGap", "col1", "col2", "col3", "col4"]} />
      ),
      render: ({ columns, colGap, col1: C1, col2: C2, col3: C3, col4: C4, id, ...chrome }) => {
        const n = Number(columns) || 2;
        const g = gapCls[colGap] || gapCls.md;
        const grid =
          n === 4
            ? "md:grid-cols-4"
            : n === 3
              ? "md:grid-cols-3"
              : "md:grid-cols-2";
        return (
          <BlockShell id={id} chrome={chrome} className={`grid grid-cols-1 py-3 ${grid} ${g}`}>
            <C1 />
            <C2 />
            {n >= 3 ? <C3 /> : null}
            {n >= 4 ? <C4 /> : null}
          </BlockShell>
        );
      },
    },
    Stack: {
      label: "پشته عمودی",
      fields: withChromeFields({
        stackGap: {
          type: "select",
          label: "فاصله",
          options: [
            { label: "کم", value: "sm" },
            { label: "متوسط", value: "md" },
            { label: "زیاد", value: "lg" },
          ],
        },
        content: { type: "slot", label: "محتوا" },
      }),
      defaultProps: {
        ...chromeDefaults(),
        stackGap: "md",
        content: [],
      },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["stackGap", "content"]} />,
      render: ({ stackGap, content: Content, id, ...chrome }) => (
        <BlockShell
          id={id}
          chrome={chrome}
          className={`flex flex-col ${gapCls[stackGap] || gapCls.md}`}
        >
          <Content />
        </BlockShell>
      ),
    },
    Spacer: {
      label: "فاصله‌گذار",
      fields: withChromeFields({
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
        customHeight: { type: "text", label: "ارتفاع سفارشی (مثلاً 48px)" },
      }),
      defaultProps: { ...chromeDefaults({ widthMode: "full" }), size: "md", customHeight: "" },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["size", "customHeight"]} />,
      render: ({ size, customHeight, id, ...chrome }) => (
        <BlockShell
          id={id}
          chrome={chrome}
          className={customHeight ? undefined : spacerH[size] || spacerH.md}
          style={customHeight ? { height: customHeight } : undefined}
          as="div"
        >
          <span className="sr-only" aria-hidden />
        </BlockShell>
      ),
    },
    Divider: {
      label: "جداکننده",
      fields: withChromeFields({
        thickness: { type: "text", label: "ضخامت" },
        color: { type: "text", label: "رنگ" },
      }),
      defaultProps: {
        ...chromeDefaults({ padT: "0.75rem", padB: "0.75rem" }),
        thickness: "1px",
        color: "var(--border)",
      },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["thickness", "color"]} />,
      render: ({ thickness, color, id, ...chrome }) => (
        <BlockShell id={id} chrome={chrome}>
          <hr
            style={{
              border: "none",
              borderTop: `${thickness || "1px"} solid ${color || "var(--border)"}`,
            }}
          />
        </BlockShell>
      ),
    },
    Heading: {
      label: "عنوان",
      fields: withChromeFields({
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
      }),
      defaultProps: {
        ...chromeDefaults({ padT: "0.75rem", padB: "0.75rem", fontWeight: "700" }),
        text: "عنوان بخش",
        level: "h2",
      },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["text", "level"]} />,
      render: ({ text, level, id, ...chrome }) => {
        const safeLevel = level === "h1" || level === "h3" ? level : "h2";
        const cls =
          safeLevel === "h1"
            ? "text-2xl font-bold sm:text-3xl"
            : safeLevel === "h3"
              ? "text-base font-bold sm:text-lg"
              : "text-lg font-bold sm:text-xl";
        const Tag = safeLevel;
        return (
          <BlockShell id={id} chrome={chrome}>
            <Tag className={cls}>{text}</Tag>
          </BlockShell>
        );
      },
    },
    Paragraph: {
      label: "پاراگراف",
      fields: withChromeFields({
        text: { type: "textarea", label: "متن" },
      }),
      defaultProps: {
        ...chromeDefaults({ padT: "0.5rem", padB: "0.5rem" }),
        text: "متن پاراگراف…",
      },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["text"]} />,
      render: ({ text, id, ...chrome }) => (
        <BlockShell id={id} chrome={chrome}>
          <p className="max-w-2xl text-sm text-muted sm:text-base whitespace-pre-wrap">{text}</p>
        </BlockShell>
      ),
    },
    Text: {
      label: "متن",
      fields: withChromeFields({
        text: { type: "textarea", label: "متن" },
      }),
      defaultProps: {
        ...chromeDefaults({ padT: "0.5rem", padB: "0.5rem" }),
        text: "توضیح کوتاه این بخش…",
      },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["text"]} />,
      render: ({ text, id, ...chrome }) => (
        <BlockShell id={id} chrome={chrome}>
          <p className="max-w-2xl text-sm text-muted sm:text-base whitespace-pre-wrap">{text}</p>
        </BlockShell>
      ),
    },
    RichText: {
      label: "متن غنی",
      fields: withChromeFields({
        text: { type: "textarea", label: "متن (خط‌جدید حفظ می‌شود)" },
      }),
      defaultProps: {
        ...chromeDefaults(),
        text: "متن چندخطی…",
      },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["text"]} />,
      render: ({ text, id, ...chrome }) => (
        <BlockShell id={id} chrome={chrome}>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-[var(--fg)]">
            {text}
          </div>
        </BlockShell>
      ),
    },
    BulletList: {
      label: "لیست گلوله‌ای",
      fields: withChromeFields({
        items: {
          type: "array",
          label: "آیتم‌ها",
          getItemSummary: (item: { text?: string }) => item.text || "آیتم",
          arrayFields: { text: { type: "text", label: "متن" } },
          defaultItemProps: { text: "مورد" },
        },
      }),
      defaultProps: {
        ...chromeDefaults(),
        items: [{ text: "مورد اول" }, { text: "مورد دوم" }],
      },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["items"]} />,
      render: ({ items, id, ...chrome }) => (
        <BlockShell id={id} chrome={chrome}>
          <ul className="list-disc space-y-1 pe-5 text-sm">
            {(items || []).map((it, i) => (
              <li key={i}>{it.text}</li>
            ))}
          </ul>
        </BlockShell>
      ),
    },
    Image: {
      label: "تصویر",
      fields: withChromeFields({
        imageUrl: { type: "text", label: "آدرس تصویر" },
        alt: { type: "text", label: "متن جایگزین" },
        href: { type: "text", label: "لینک (اختیاری)" },
        objectFit: {
          type: "radio",
          label: "برش",
          options: [
            { label: "cover", value: "cover" },
            { label: "contain", value: "contain" },
          ],
        },
      }),
      defaultProps: {
        ...chromeDefaults(),
        imageUrl: "",
        alt: "",
        href: "",
        objectFit: "cover",
      },
      renderFields: ({ fields }) => (
        <StyleFieldTabs fields={fields} content={["imageUrl", "alt", "href", "objectFit"]} />
      ),
      render: ({ imageUrl, alt, href, objectFit, id, puck, ...chrome }) => {
        if (!imageUrl) {
          return meta(puck).editing ? (
            <EmptyHint>آدرس تصویر را وارد کنید.</EmptyHint>
          ) : (
            <></>
          );
        }
        const img = (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={alt || ""}
            className={`w-full ${objectFit === "contain" ? "object-contain" : "object-cover"}`}
          />
        );
        return (
          <BlockShell id={id} chrome={chrome}>
            {href ? (
              <Link href={href} className="block overflow-hidden">
                {img}
              </Link>
            ) : (
              img
            )}
          </BlockShell>
        );
      },
    },
    ImageBanner: {
      label: "بنر تصویری",
      fields: withChromeFields({
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
      }),
      defaultProps: {
        ...chromeDefaults({ padT: "0.75rem", padB: "0.75rem" }),
        imageUrl: "",
        href: "/catalog",
        alt: "بنر",
        height: "md",
        rounded: true,
      },
      renderFields: ({ fields }) => (
        <StyleFieldTabs fields={fields} content={["imageUrl", "href", "alt", "height", "rounded"]} />
      ),
      render: ({ imageUrl, href, alt, height, rounded, puck, id, ...chrome }) => {
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
          <BlockShell id={id} chrome={chrome} as="section">
            {href ? (
              <Link href={href} className="block overflow-hidden">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </BlockShell>
        );
      },
    },
    VideoEmbed: {
      label: "ویدیو (embed)",
      fields: withChromeFields({
        url: { type: "text", label: "آدرس embed (YouTube/Aparat)" },
        title: { type: "text", label: "عنوان دسترس‌پذیری" },
        aspect: {
          type: "radio",
          label: "نسبت تصویر",
          options: [
            { label: "۱۶:۹", value: "16:9" },
            { label: "۴:۳", value: "4:3" },
            { label: "۱:۱", value: "1:1" },
          ],
        },
      }),
      defaultProps: {
        ...chromeDefaults(),
        url: "",
        title: "ویدیو",
        aspect: "16:9",
      },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["url", "title", "aspect"]} />,
      render: ({ url, title, aspect, id, puck, ...chrome }) => {
        if (!url) {
          return meta(puck).editing ? (
            <EmptyHint>آدرس embed را وارد کنید.</EmptyHint>
          ) : (
            <></>
          );
        }
        const pb =
          aspect === "1:1" ? "100%" : aspect === "4:3" ? "75%" : "56.25%";
        const safe = /^https:\/\//i.test(url) ? url : "";
        if (!safe) {
          return meta(puck).editing ? (
            <EmptyHint>فقط آدرس https مجاز است.</EmptyHint>
          ) : (
            <></>
          );
        }
        return (
          <BlockShell id={id} chrome={chrome}>
            <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingBottom: pb }}>
              <iframe
                src={safe}
                title={title || "ویدیو"}
                className="absolute inset-0 h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </BlockShell>
        );
      },
    },
    Icon: {
      label: "آیکون/ایموجی",
      fields: withChromeFields({
        name: { type: "text", label: "ایموجی یا متن" },
        size: { type: "text", label: "اندازه (مثلاً 2rem)" },
      }),
      defaultProps: {
        ...chromeDefaults({ textAlign: "center" }),
        name: "⭐",
        size: "2rem",
      },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["name", "size"]} />,
      render: ({ name, size, id, ...chrome }) => (
        <BlockShell id={id} chrome={chrome}>
          <span style={{ fontSize: size || "2rem" }} aria-hidden>
            {name}
          </span>
        </BlockShell>
      ),
    },
    CtaButton: {
      label: "دکمه CTA",
      fields: withChromeFields({
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
      }),
      defaultProps: {
        ...chromeDefaults({ padT: "1rem", padB: "1rem" }),
        label: "ورود به فروشگاه",
        href: "/catalog",
        variant: "primary",
        fullWidth: true,
      },
      renderFields: ({ fields }) => (
        <StyleFieldTabs fields={fields} content={["label", "href", "variant", "fullWidth"]} />
      ),
      render: ({ label, href, variant, fullWidth, id, ...chrome }) => {
        const wide = asBool(fullWidth, true);
        return (
          <BlockShell id={id} chrome={chrome} as="section">
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
          </BlockShell>
        );
      },
    },
    ButtonGroup: {
      label: "گروه دکمه",
      fields: withChromeFields({
        align: {
          type: "radio",
          label: "تراز",
          options: [
            { label: "راست", value: "start" },
            { label: "وسط", value: "center" },
            { label: "چپ", value: "end" },
          ],
        },
        buttons: {
          type: "array",
          label: "دکمه‌ها",
          getItemSummary: (item: { label?: string }) => item.label || "دکمه",
          arrayFields: {
            label: { type: "text", label: "متن" },
            href: { type: "text", label: "لینک" },
            variant: {
              type: "radio",
              label: "نوع",
              options: [
                { label: "اصلی", value: "primary" },
                { label: "حاشیه", value: "outline" },
              ],
            },
          },
          defaultItemProps: {
            label: "دکمه",
            href: "/catalog",
            variant: "primary",
          },
        },
      }),
      defaultProps: {
        ...chromeDefaults({ padT: "1rem", padB: "1rem" }),
        align: "start",
        buttons: [
          { label: "خرید", href: "/catalog", variant: "primary" },
          { label: "تماس", href: "/contact", variant: "outline" },
        ],
      },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["align", "buttons"]} />,
      render: ({ align, buttons, id, ...chrome }) => (
        <BlockShell id={id} chrome={chrome}>
          <div
            className={`flex flex-wrap gap-3 ${
              align === "center"
                ? "justify-center"
                : align === "end"
                  ? "justify-end"
                  : "justify-start"
            }`}
          >
            {(buttons || []).map((b, i) => (
              <Link
                key={i}
                href={b.href || "/"}
                className={
                  b.variant === "outline"
                    ? "inline-flex min-h-11 items-center justify-center rounded-xl border border-theme px-5 text-sm font-semibold"
                    : "inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-[var(--accent-fg)]"
                }
              >
                {b.label}
              </Link>
            ))}
          </div>
        </BlockShell>
      ),
    },
    Badge: {
      label: "نشان",
      fields: withChromeFields({
        label: { type: "text", label: "متن" },
        tone: {
          type: "radio",
          label: "حالت",
          options: [
            { label: "اکسنت", value: "accent" },
            { label: "خنثی", value: "muted" },
            { label: "داغ", value: "hot" },
          ],
        },
      }),
      defaultProps: {
        ...chromeDefaults(),
        label: "جدید",
        tone: "accent",
      },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["label", "tone"]} />,
      render: ({ label, tone, id, ...chrome }) => {
        const cls =
          tone === "hot"
            ? "bg-[var(--accent-hot)] text-white"
            : tone === "muted"
              ? "bg-[var(--border)] text-[var(--fg)]"
              : "bg-[var(--accent-soft)] text-[var(--accent)]";
        return (
          <BlockShell id={id} chrome={chrome}>
            <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold ${cls}`}>
              {label}
            </span>
          </BlockShell>
        );
      },
    },
    Quote: {
      label: "نقل‌قول",
      fields: withChromeFields({
        text: { type: "textarea", label: "متن" },
        cite: { type: "text", label: "منبع" },
      }),
      defaultProps: {
        ...chromeDefaults({
          padT: "1rem",
          padB: "1rem",
          padR: "1rem",
          padL: "1rem",
          bgColor: "var(--card)",
          borderRadius: "1rem",
        }),
        text: "نقل‌قول مشتری…",
        cite: "",
      },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["text", "cite"]} />,
      render: ({ text, cite, id, ...chrome }) => (
        <BlockShell id={id} chrome={chrome} as="blockquote">
          <p className="text-base italic">«{text}»</p>
          {cite ? <cite className="mt-2 block text-sm text-muted not-italic">— {cite}</cite> : null}
        </BlockShell>
      ),
    },
    HtmlEmbed: {
      label: "HTML سفارشی",
      fields: withChromeFields({
        html: {
          type: "textarea",
          label: "HTML (بدون script — فقط برای ادمین قابل اعتماد)",
        },
      }),
      defaultProps: {
        ...chromeDefaults(),
        html: "<p>محتوای HTML</p>",
      },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["html"]} />,
      render: ({ html, id, ...chrome }) => {
        const cleaned = String(html || "")
          .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
          .replace(/\son\w+=/gi, " data-blocked=")
          .replace(/javascript:/gi, "");
        return (
          <BlockShell id={id} chrome={chrome}>
            <div dangerouslySetInnerHTML={{ __html: cleaned }} />
          </BlockShell>
        );
      },
    },
    TwoColumns: {
      label: "دو ستون (کلاسیک)",
      fields: withChromeFields({
        colGap: {
          type: "select",
          label: "فاصله",
          options: [
            { label: "کم", value: "sm" },
            { label: "متوسط", value: "md" },
            { label: "زیاد", value: "lg" },
          ],
        },
      }),
      defaultProps: {
        ...chromeDefaults(),
        colGap: "md",
      },
      renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["colGap"]} />,
      render: (props) => {
        const { colGap, id, ...chrome } = props;
        const legacyGap = (props as { gap?: "sm" | "md" | "lg" }).gap;
        const g = gapCls[colGap || legacyGap || "md"] || gapCls.md;
        return (
          <BlockShell
            id={id}
            chrome={chrome}
            className={`grid grid-cols-1 py-3 md:grid-cols-2 ${g}`}
            as="section"
          >
            <DropZone zone="left" />
            <DropZone zone="right" />
          </BlockShell>
        );
      },
    },
    ...extraBlocks,
  },
} as unknown as Config<PuckComponents, PuckRootProps>;

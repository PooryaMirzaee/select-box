// @ts-nocheck — props از Puck به‌صورت پویا تزریق می‌شوند
"use client";

import Link from "next/link";

import { EmptyHint, asBool, gapCls, meta } from "../helpers";
import {
  BlockShell,
  StyleFieldTabs,
  chromeDefaults,
  withChromeFields,
} from "../style";

function safeHttps(url: string) {
  return /^https:\/\//i.test(url || "") ? url : "";
}

/** بلوک‌های تکمیلی — تایپ سخت از طریق PuckComponents در config اعمال می‌شود */
export const extraBlocks: Record<string, unknown> = {
  AnnouncementBar: {
    label: "نوار اعلان",
    fields: withChromeFields({
      text: { type: "text", label: "متن" },
      href: { type: "text", label: "لینک (اختیاری)" },
      hrefLabel: { type: "text", label: "متن لینک" },
      dismissible: {
        type: "radio",
        label: "قابل بستن (فقط ظاهری)",
        options: [
          { label: "خیر", value: false },
          { label: "بله", value: true },
        ],
      },
    }),
    defaultProps: {
      ...chromeDefaults({
        widthMode: "full",
        bgColor: "var(--accent)",
        textColor: "var(--accent-fg)",
        textAlign: "center",
        padT: "0.6rem",
        padB: "0.6rem",
        padR: "1rem",
        padL: "1rem",
        fontSize: "0.875rem",
        fontWeight: "600",
      }),
      text: "ارسال رایگان برای سفارش‌های بالای ۳ میلیون تومان",
      href: "/catalog",
      hrefLabel: "مشاهده",
      dismissible: false,
    },
    renderFields: ({ fields }) => (
        <StyleFieldTabs fields={fields} content={["text", "href", "hrefLabel", "dismissible"]} />
    ),
    render: ({ text, href, hrefLabel, id, ...chrome }) => (
      <BlockShell id={id} chrome={chrome} as="div">
        <span>{text}</span>
        {href && hrefLabel ? (
          <>
            {" "}
            <Link href={href} className="underline underline-offset-2">
              {hrefLabel}
            </Link>
          </>
        ) : null}
      </BlockShell>
    ),
  },

  HeroBanner: {
    label: "هیرو تک‌بنر",
    fields: withChromeFields({
      eyebrow: { type: "text", label: "برچسب" },
      title: { type: "text", label: "عنوان" },
      subtitle: { type: "textarea", label: "توضیح" },
      imageUrl: { type: "text", label: "تصویر پس‌زمینه" },
      ctaLabel: { type: "text", label: "متن دکمه" },
      ctaHref: { type: "text", label: "لینک دکمه" },
      secondaryLabel: { type: "text", label: "دکمه دوم" },
      secondaryHref: { type: "text", label: "لینک دکمه دوم" },
      minHeight: { type: "text", label: "حداقل ارتفاع (مثلاً 420px)" },
      overlay: { type: "text", label: "پوشش تیره (rgba)" },
    }),
    defaultProps: {
      ...chromeDefaults({
        widthMode: "full",
        textColor: "#fff",
        textAlign: "start",
        padT: "3rem",
        padB: "3rem",
        padR: "1.5rem",
        padL: "1.5rem",
      }),
      eyebrow: "فروشگاه دشتستان",
      title: "لوازم خانگی با گارانتی اصلی",
      subtitle: "ارسال سریع، قیمت شفاف، پشتیبانی تخصصی.",
      imageUrl: "",
      ctaLabel: "مشاهده محصولات",
      ctaHref: "/catalog",
      secondaryLabel: "تماس",
      secondaryHref: "/contact",
      minHeight: "420px",
      overlay: "rgba(0,0,0,0.45)",
    },
    renderFields: ({ fields }) => (
        <StyleFieldTabs
        fields={fields}
        content={[
          "eyebrow",
          "title",
          "subtitle",
          "imageUrl",
          "ctaLabel",
          "ctaHref",
          "secondaryLabel",
          "secondaryHref",
          "minHeight",
          "overlay",
        ]}
      />
    ),
    render: ({
      eyebrow,
      title,
      subtitle,
      imageUrl,
      ctaLabel,
      ctaHref,
      secondaryLabel,
      secondaryHref,
      minHeight,
      overlay,
      id,
      ...chrome
    }) => (
      <BlockShell
        id={id}
        chrome={{
          ...chrome,
          widthMode: "full",
          bgImage: imageUrl || chrome.bgImage,
          bgOverlay: overlay || chrome.bgOverlay,
        }}
        className="relative overflow-hidden"
        style={{ minHeight: minHeight || "420px" }}
        as="section"
      >
        <div className="relative shop-container flex h-full min-h-[inherit] flex-col justify-center py-10">
          {eyebrow ? (
            <p className="text-xs font-semibold tracking-wide opacity-90">{eyebrow}</p>
          ) : null}
          <h1 className="mt-2 max-w-2xl text-3xl font-bold sm:text-4xl md:text-5xl">{title}</h1>
          {subtitle ? (
            <p className="mt-3 max-w-xl text-sm opacity-90 sm:text-base">{subtitle}</p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            {ctaLabel ? (
              <Link
                href={ctaHref || "/catalog"}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--accent)] px-6 text-sm font-bold text-[var(--accent-fg)]"
              >
                {ctaLabel}
              </Link>
            ) : null}
            {secondaryLabel ? (
              <Link
                href={secondaryHref || "/"}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/40 px-6 text-sm font-semibold"
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </BlockShell>
    ),
  },

  StatsRow: {
    label: "آمار و ارقام",
    fields: withChromeFields({
      title: { type: "text", label: "عنوان بخش" },
      items: {
        type: "array",
        label: "آیتم‌ها",
        getItemSummary: (item: { label?: string; value?: string }) =>
          item.label || item.value || "آمار",
        arrayFields: {
          value: { type: "text", label: "مقدار" },
          label: { type: "text", label: "برچسب" },
          suffix: { type: "text", label: "پسوند (+ / %)" },
        },
        defaultItemProps: { value: "100", label: "مشتری", suffix: "+" },
      },
    }),
    defaultProps: {
      ...chromeDefaults({ padT: "1.5rem", padB: "1.5rem" }),
      title: "",
      items: [
        { value: "10", label: "سال تجربه", suffix: "+" },
        { value: "5000", label: "محصول", suffix: "+" },
        { value: "98", label: "رضایت", suffix: "%" },
        { value: "24", label: "پشتیبانی", suffix: "/۷" },
      ],
    },
    renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["title", "items"]} />,
    render: ({ title, items, id, ...chrome }) => (
      <BlockShell id={id} chrome={chrome} as="section">
        {title ? <h2 className="mb-5 text-lg font-bold sm:text-xl">{title}</h2> : null}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {(items || []).map((it, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl font-bold text-[var(--accent)] sm:text-3xl">
                {it.value}
                {it.suffix || ""}
              </p>
              <p className="mt-1 text-sm text-muted">{it.label}</p>
            </div>
          ))}
        </div>
      </BlockShell>
    ),
  },

  Testimonials: {
    label: "نظرات مشتریان",
    fields: withChromeFields({
      title: { type: "text", label: "عنوان" },
      columns: {
        type: "radio",
        label: "ستون",
        options: [
          { label: "۱", value: "1" },
          { label: "۲", value: "2" },
          { label: "۳", value: "3" },
        ],
      },
      items: {
        type: "array",
        label: "نظرات",
        getItemSummary: (item: { name?: string }) => item.name || "نظر",
        arrayFields: {
          name: { type: "text", label: "نام" },
          role: { type: "text", label: "نقش/شهر" },
          text: { type: "textarea", label: "متن نظر" },
          rating: { type: "number", label: "امتیاز ۱–۵", min: 1, max: 5 },
          avatarUrl: { type: "text", label: "آواتار" },
        },
        defaultItemProps: {
          name: "کاربر",
          role: "تهران",
          text: "خرید راضی‌کننده‌ای بود.",
          rating: 5,
          avatarUrl: "",
        },
      },
    }),
    defaultProps: {
      ...chromeDefaults({ padT: "1.5rem", padB: "1.5rem" }),
      title: "نظر مشتریان",
      columns: "3",
      items: [
        {
          name: "مریم",
          role: "اصفهان",
          text: "ارسال سریع و بسته‌بندی عالی.",
          rating: 5,
          avatarUrl: "",
        },
        {
          name: "علی",
          role: "تهران",
          text: "پشتیبانی پاسخگو بود.",
          rating: 5,
          avatarUrl: "",
        },
        {
          name: "سارا",
          role: "شیراز",
          text: "قیمت شفاف و گارانتی واقعی.",
          rating: 4,
          avatarUrl: "",
        },
      ],
    },
    renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["title", "columns", "items"]} />,
    render: ({ title, columns, items, id, ...chrome }) => {
      const cols =
        columns === "1"
          ? "md:grid-cols-1"
          : columns === "2"
            ? "md:grid-cols-2"
            : "md:grid-cols-3";
      return (
        <BlockShell id={id} chrome={chrome} as="section">
          {title ? <h2 className="mb-5 text-lg font-bold sm:text-xl">{title}</h2> : null}
          <div className={`grid grid-cols-1 gap-4 ${cols}`}>
            {(items || []).map((it, i) => (
              <figure
                key={i}
                className="rounded-2xl border border-theme bg-card p-5 shadow-[var(--shadow-card)]"
              >
                <div className="mb-2 text-[var(--accent)]">
                  {"★".repeat(Math.min(5, Math.max(1, Number(it.rating) || 5)))}
                </div>
                <blockquote className="text-sm leading-relaxed">{it.text}</blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  {it.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.avatarUrl}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]">
                      {(it.name || "?").charAt(0)}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-semibold">{it.name}</p>
                    {it.role ? <p className="text-xs text-muted">{it.role}</p> : null}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </BlockShell>
      );
    },
  },

  PricingCards: {
    label: "جدول قیمت / پلن",
    fields: withChromeFields({
      title: { type: "text", label: "عنوان" },
      items: {
        type: "array",
        label: "پلن‌ها",
        getItemSummary: (item: { name?: string }) => item.name || "پلن",
        arrayFields: {
          name: { type: "text", label: "نام" },
          price: { type: "text", label: "قیمت" },
          period: { type: "text", label: "دوره (مثلاً /ماه)" },
          features: { type: "textarea", label: "ویژگی‌ها (هر خط یکی)" },
          ctaLabel: { type: "text", label: "متن دکمه" },
          ctaHref: { type: "text", label: "لینک" },
          highlighted: {
            type: "radio",
            label: "برجسته",
            options: [
              { label: "خیر", value: false },
              { label: "بله", value: true },
            ],
          },
        },
        defaultItemProps: {
          name: "پایه",
          price: "۰",
          period: "",
          features: "ویژگی یک\nویژگی دو",
          ctaLabel: "انتخاب",
          ctaHref: "/contact",
          highlighted: false,
        },
      },
    }),
    defaultProps: {
      ...chromeDefaults({ padT: "1.5rem", padB: "1.5rem" }),
      title: "پلن‌ها",
      items: [
        {
          name: "خرده‌فروشی",
          price: "رایگان",
          period: "",
          features: "مشاوره\nگارانتی اصلی\nارسال سریع",
          ctaLabel: "شروع خرید",
          ctaHref: "/catalog",
          highlighted: false,
        },
        {
          name: "عمده",
          price: "توافقی",
          period: "",
          features: "قیمت پلکانی\nپیش‌فاکتور\nپشتیبانی اختصاصی",
          ctaLabel: "درخواست عمده",
          ctaHref: "/business",
          highlighted: true,
        },
      ],
    },
    renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["title", "items"]} />,
    render: ({ title, items, id, ...chrome }) => (
      <BlockShell id={id} chrome={chrome} as="section">
        {title ? <h2 className="mb-5 text-lg font-bold sm:text-xl">{title}</h2> : null}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(items || []).map((it, i) => {
            const hot = asBool(it.highlighted, false);
            return (
              <div
                key={i}
                className={
                  hot
                    ? "rounded-2xl border-2 border-[var(--accent)] bg-card p-6 shadow-[var(--shadow-soft)]"
                    : "rounded-2xl border border-theme bg-card p-6"
                }
              >
                <h3 className="font-bold">{it.name}</h3>
                <p className="mt-2 text-3xl font-bold text-[var(--accent)]">
                  {it.price}
                  {it.period ? (
                    <span className="text-sm font-normal text-muted">{it.period}</span>
                  ) : null}
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  {String(it.features || "")
                    .split("\n")
                    .filter(Boolean)
                    .map((line, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="text-[var(--accent)]">✓</span>
                        <span>{line}</span>
                      </li>
                    ))}
                </ul>
                {it.ctaLabel ? (
                  <Link
                    href={it.ctaHref || "/"}
                    className={
                      hot
                        ? "mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-bold text-[var(--accent-fg)]"
                        : "mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-theme text-sm font-semibold"
                    }
                  >
                    {it.ctaLabel}
                  </Link>
                ) : null}
              </div>
            );
          })}
        </div>
      </BlockShell>
    ),
  },

  StepsProcess: {
    label: "مراحل / فرآیند",
    fields: withChromeFields({
      title: { type: "text", label: "عنوان" },
      items: {
        type: "array",
        label: "مراحل",
        getItemSummary: (item: { title?: string }, i?: number) =>
          item.title || `مرحله ${(i || 0) + 1}`,
        arrayFields: {
          title: { type: "text", label: "عنوان" },
          desc: { type: "textarea", label: "توضیح" },
        },
        defaultItemProps: { title: "مرحله", desc: "" },
      },
    }),
    defaultProps: {
      ...chromeDefaults({ padT: "1.5rem", padB: "1.5rem" }),
      title: "چطور سفارش بدهم؟",
      items: [
        { title: "انتخاب محصول", desc: "از کاتالوگ یا دسته‌بندی‌ها." },
        { title: "ثبت سفارش", desc: "سبد خرید و اطلاعات ارسال." },
        { title: "پرداخت امن", desc: "درگاه معتبر بانکی." },
        { title: "تحویل", desc: "ارسال سریع به سراسر کشور." },
      ],
    },
    renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["title", "items"]} />,
    render: ({ title, items, id, ...chrome }) => (
      <BlockShell id={id} chrome={chrome} as="section">
        {title ? <h2 className="mb-6 text-lg font-bold sm:text-xl">{title}</h2> : null}
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(items || []).map((it, i) => (
            <li key={i} className="relative rounded-2xl border border-theme bg-card p-5">
              <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--accent-fg)]">
                {i + 1}
              </span>
              <h3 className="font-bold">{it.title}</h3>
              {it.desc ? <p className="mt-1 text-sm text-muted">{it.desc}</p> : null}
            </li>
          ))}
        </ol>
      </BlockShell>
    ),
  },

  Accordion: {
    label: "آکاردئون",
    fields: withChromeFields({
      title: { type: "text", label: "عنوان بخش" },
      items: {
        type: "array",
        label: "آیتم‌ها",
        getItemSummary: (item: { title?: string }) => item.title || "آیتم",
        arrayFields: {
          title: { type: "text", label: "عنوان" },
          body: { type: "textarea", label: "محتوا" },
        },
        defaultItemProps: { title: "عنوان", body: "متن…" },
      },
    }),
    defaultProps: {
      ...chromeDefaults({ padT: "1rem", padB: "1rem" }),
      title: "",
      items: [
        { title: "شرایط گارانتی", body: "گارانتی مطابق شرایط سازنده." },
        { title: "مرجوعی", body: "تا ۷ روز در صورت سلامت کالا." },
      ],
    },
    renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["title", "items"]} />,
    render: ({ title, items, id, ...chrome }) => (
      <BlockShell id={id} chrome={chrome} as="section">
        {title ? <h2 className="mb-4 text-lg font-bold">{title}</h2> : null}
        <div className="space-y-2">
          {(items || []).map((it, i) => (
            <details key={i} className="rounded-xl border border-theme bg-card px-4 py-3">
              <summary className="cursor-pointer font-semibold">{it.title}</summary>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{it.body}</p>
            </details>
          ))}
        </div>
      </BlockShell>
    ),
  },

  MapEmbed: {
    label: "نقشه",
    fields: withChromeFields({
      embedUrl: { type: "text", label: "آدرس embed نقشه (https)" },
      title: { type: "text", label: "عنوان دسترس‌پذیری" },
      height: { type: "text", label: "ارتفاع (مثلاً 320px)" },
    }),
    defaultProps: {
      ...chromeDefaults({ borderRadius: "1rem", overflow: "hidden" }),
      embedUrl: "",
      title: "موقعیت فروشگاه",
      height: "320px",
    },
    renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["embedUrl", "title", "height"]} />,
    render: ({ embedUrl, title, height, id, puck, ...chrome }) => {
      const url = safeHttps(embedUrl);
      if (!url) {
        return meta(puck).editing ? (
          <EmptyHint>آدرس embed نقشه (https) را وارد کنید.</EmptyHint>
        ) : (
          <></>
        );
      }
      return (
        <BlockShell id={id} chrome={chrome}>
          <iframe
            src={url}
            title={title || "نقشه"}
            className="w-full border-0"
            style={{ height: height || "320px" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </BlockShell>
      );
    },
  },

  SocialLinks: {
    label: "شبکه‌های اجتماعی",
    fields: withChromeFields({
      title: { type: "text", label: "عنوان" },
      items: {
        type: "array",
        label: "لینک‌ها",
        getItemSummary: (item: { label?: string }) => item.label || "لینک",
        arrayFields: {
          label: { type: "text", label: "نام" },
          href: { type: "text", label: "آدرس" },
          icon: { type: "text", label: "ایموجی/متن" },
        },
        defaultItemProps: { label: "اینستاگرام", href: "https://instagram.com", icon: "📷" },
      },
    }),
    defaultProps: {
      ...chromeDefaults({ textAlign: "center", padT: "1rem", padB: "1rem" }),
      title: "ما را دنبال کنید",
      items: [
        { label: "اینستاگرام", href: "https://instagram.com", icon: "📷" },
        { label: "تلگرام", href: "https://t.me", icon: "✈️" },
        { label: "واتساپ", href: "https://wa.me", icon: "💬" },
      ],
    },
    renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["title", "items"]} />,
    render: ({ title, items, id, ...chrome }) => (
      <BlockShell id={id} chrome={chrome} as="section">
        {title ? <h2 className="mb-4 text-lg font-bold">{title}</h2> : null}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {(items || []).map((it, i) => (
            <Link
              key={i}
              href={it.href || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-theme bg-card px-4 text-sm font-semibold hover:border-[var(--accent)]"
            >
              {it.icon ? <span aria-hidden>{it.icon}</span> : null}
              {it.label}
            </Link>
          ))}
        </div>
      </BlockShell>
    ),
  },

  ContactInfo: {
    label: "اطلاعات تماس",
    fields: withChromeFields({
      title: { type: "text", label: "عنوان" },
      phone: { type: "text", label: "تلفن" },
      mobile: { type: "text", label: "موبایل" },
      email: { type: "text", label: "ایمیل" },
      address: { type: "textarea", label: "آدرس" },
      hours: { type: "text", label: "ساعات کاری" },
    }),
    defaultProps: {
      ...chromeDefaults({
        padT: "1.25rem",
        padB: "1.25rem",
        padR: "1.25rem",
        padL: "1.25rem",
        bgColor: "var(--card)",
        borderWidth: "1px",
        borderColor: "var(--border)",
        borderRadius: "1rem",
      }),
      title: "تماس با ما",
      phone: "",
      mobile: "",
      email: "",
      address: "",
      hours: "",
    },
    renderFields: ({ fields }) => (
        <StyleFieldTabs fields={fields} content={["title", "phone", "mobile", "email", "address", "hours"]} />
    ),
    render: ({ title, phone, mobile, email, address, hours, id, ...chrome }) => (
      <BlockShell id={id} chrome={chrome} as="section">
        {title ? <h2 className="mb-3 text-lg font-bold">{title}</h2> : null}
        <ul className="space-y-2 text-sm">
          {phone ? (
            <li>
              تلفن:{" "}
              <a className="text-[var(--accent)]" href={`tel:${phone}`}>
                {phone}
              </a>
            </li>
          ) : null}
          {mobile ? (
            <li>
              موبایل:{" "}
              <a className="text-[var(--accent)]" href={`tel:${mobile}`}>
                {mobile}
              </a>
            </li>
          ) : null}
          {email ? (
            <li>
              ایمیل:{" "}
              <a className="text-[var(--accent)]" href={`mailto:${email}`}>
                {email}
              </a>
            </li>
          ) : null}
          {address ? <li className="whitespace-pre-wrap">آدرس: {address}</li> : null}
          {hours ? <li>ساعات کاری: {hours}</li> : null}
        </ul>
      </BlockShell>
    ),
  },

  Gallery: {
    label: "گالری تصاویر",
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
        label: "تصاویر",
        getItemSummary: (item: { alt?: string }) => item.alt || "تصویر",
        arrayFields: {
          imageUrl: { type: "text", label: "آدرس" },
          alt: { type: "text", label: "متن جایگزین" },
          href: { type: "text", label: "لینک" },
        },
        defaultItemProps: { imageUrl: "", alt: "", href: "" },
      },
    }),
    defaultProps: {
      ...chromeDefaults({ padT: "1rem", padB: "1rem" }),
      title: "گالری",
      columns: "3",
      items: [],
    },
    renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["title", "columns", "items"]} />,
    render: ({ title, columns, items, id, puck, ...chrome }) => {
      if (!items?.length) {
        return meta(puck).editing ? <EmptyHint>تصویر به گالری اضافه کنید.</EmptyHint> : <></>;
      }
      const cols =
        columns === "2"
          ? "md:grid-cols-2"
          : columns === "4"
            ? "md:grid-cols-4"
            : "md:grid-cols-3";
      return (
        <BlockShell id={id} chrome={chrome} as="section">
          {title ? <h2 className="mb-4 text-lg font-bold">{title}</h2> : null}
          <div className={`grid grid-cols-2 gap-3 ${cols}`}>
            {items.map((it, i) => {
              if (!it.imageUrl) return null;
              const img = (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.imageUrl}
                  alt={it.alt || ""}
                  className="aspect-[4/3] w-full rounded-xl object-cover"
                />
              );
              return it.href ? (
                <Link key={i} href={it.href} className="block overflow-hidden">
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

  Callout: {
    label: "جعبه توجه / Callout",
    fields: withChromeFields({
      title: { type: "text", label: "عنوان" },
      body: { type: "textarea", label: "متن" },
      tone: {
        type: "select",
        label: "حالت",
        options: [
          { label: "اطلاع", value: "info" },
          { label: "موفق", value: "success" },
          { label: "هشدار", value: "warning" },
          { label: "اکسنت", value: "accent" },
        ],
      },
    }),
    defaultProps: {
      ...chromeDefaults({
        padT: "1rem",
        padB: "1rem",
        padR: "1rem",
        padL: "1rem",
        borderRadius: "1rem",
        borderWidth: "1px",
      }),
      title: "نکته",
      body: "متن مهم برای کاربر…",
      tone: "info",
    },
    renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["title", "body", "tone"]} />,
    render: ({ title, body, tone, id, ...chrome }) => {
      const tones: Record<string, string> = {
        info: "border-sky-300 bg-sky-50 text-sky-950",
        success: "border-emerald-300 bg-emerald-50 text-emerald-950",
        warning: "border-amber-300 bg-amber-50 text-amber-950",
        accent: "border-[var(--accent)] bg-[var(--accent-soft)]",
      };
      return (
        <BlockShell id={id} chrome={chrome} className={tones[tone] || tones.info} as="aside">
          {title ? <p className="font-bold">{title}</p> : null}
          {body ? <p className="mt-1 whitespace-pre-wrap text-sm">{body}</p> : null}
        </BlockShell>
      );
    },
  },

  LinkList: {
    label: "لیست لینک",
    fields: withChromeFields({
      title: { type: "text", label: "عنوان" },
      items: {
        type: "array",
        label: "لینک‌ها",
        getItemSummary: (item: { label?: string }) => item.label || "لینک",
        arrayFields: {
          label: { type: "text", label: "متن" },
          href: { type: "text", label: "آدرس" },
        },
        defaultItemProps: { label: "لینک", href: "/" },
      },
    }),
    defaultProps: {
      ...chromeDefaults(),
      title: "میانبرها",
      items: [
        { label: "کاتالوگ", href: "/catalog" },
        { label: "درباره ما", href: "/about" },
        { label: "تماس", href: "/contact" },
      ],
    },
    renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["title", "items"]} />,
    render: ({ title, items, id, ...chrome }) => (
      <BlockShell id={id} chrome={chrome} as="nav">
        {title ? <h2 className="mb-3 text-base font-bold">{title}</h2> : null}
        <ul className="space-y-2 text-sm">
          {(items || []).map((it, i) => (
            <li key={i}>
              <Link href={it.href || "/"} className="hover:text-[var(--accent)]">
                {it.label}
              </Link>
            </li>
          ))}
        </ul>
      </BlockShell>
    ),
  },

  Marquee: {
    label: "متن متحرک",
    fields: withChromeFields({
      text: { type: "text", label: "متن" },
      speed: {
        type: "select",
        label: "سرعت",
        options: [
          { label: "آرام", value: "slow" },
          { label: "متوسط", value: "normal" },
          { label: "سریع", value: "fast" },
        ],
      },
    }),
    defaultProps: {
      ...chromeDefaults({
        widthMode: "full",
        bgColor: "var(--accent-soft)",
        padT: "0.6rem",
        padB: "0.6rem",
        overflow: "hidden",
      }),
      text: "ارسال سریع · گارانتی اصلی · پرداخت امن · ",
      speed: "normal",
    },
    renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["text", "speed"]} />,
    render: ({ text, speed, id, ...chrome }) => {
      const dur = speed === "slow" ? "40s" : speed === "fast" ? "14s" : "24s";
      const line = `${text || ""} ${text || ""}`;
      return (
        <BlockShell id={id} chrome={chrome}>
          <div className="whitespace-nowrap text-sm font-semibold" style={{ animation: `puck-marquee ${dur} linear infinite` }}>
            {line}
          </div>
          <style
            dangerouslySetInnerHTML={{
              __html: `@keyframes puck-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`,
            }}
          />
        </BlockShell>
      );
    },
  },

  OrderedList: {
    label: "لیست شماره‌دار",
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
      items: [{ text: "مورد اول" }, { text: "مورد دوم" }, { text: "مورد سوم" }],
    },
    renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["items"]} />,
    render: ({ items, id, ...chrome }) => (
      <BlockShell id={id} chrome={chrome}>
        <ol className="list-decimal space-y-1 pe-5 text-sm">
          {(items || []).map((it, i) => (
            <li key={i}>{it.text}</li>
          ))}
        </ol>
      </BlockShell>
    ),
  },

  DataTable: {
    label: "جدول ساده",
    fields: withChromeFields({
      title: { type: "text", label: "عنوان" },
      headers: { type: "text", label: "سرتیترها (با | جدا کنید)" },
      rows: {
        type: "array",
        label: "ردیف‌ها",
        getItemSummary: (item: { cells?: string }, i?: number) =>
          item.cells?.slice(0, 24) || `ردیف ${(i || 0) + 1}`,
        arrayFields: {
          cells: { type: "text", label: "سلول‌ها (با | جدا)" },
        },
        defaultItemProps: { cells: "مقدار ۱ | مقدار ۲" },
      },
    }),
    defaultProps: {
      ...chromeDefaults({ padT: "1rem", padB: "1rem" }),
      title: "",
      headers: "ویژگی | مقدار",
      rows: [
        { cells: "گارانتی | ۱۸ ماه" },
        { cells: "ارسال | ۲ تا ۵ روز" },
      ],
    },
    renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["title", "headers", "rows"]} />,
    render: ({ title, headers, rows, id, ...chrome }) => {
      const heads = String(headers || "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      return (
        <BlockShell id={id} chrome={chrome} as="section">
          {title ? <h2 className="mb-3 text-lg font-bold">{title}</h2> : null}
          <div className="overflow-x-auto rounded-xl border border-theme">
            <table className="min-w-full text-sm">
              {heads.length ? (
                <thead className="bg-[var(--bg)]">
                  <tr>
                    {heads.map((h, i) => (
                      <th key={i} className="px-3 py-2 text-start font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
              ) : null}
              <tbody>
                {(rows || []).map((row, i) => (
                  <tr key={i} className="border-t border-theme">
                    {String(row.cells || "")
                      .split("|")
                      .map((c, j) => (
                        <td key={j} className="px-3 py-2">
                          {c.trim()}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BlockShell>
      );
    },
  },

  Card: {
    label: "کارت محتوا (slot)",
    fields: withChromeFields({
      content: { type: "slot", label: "محتوای کارت" },
    }),
    defaultProps: {
      ...chromeDefaults({
        padT: "1.25rem",
        padB: "1.25rem",
        padR: "1.25rem",
        padL: "1.25rem",
        bgColor: "var(--card)",
        borderWidth: "1px",
        borderColor: "var(--border)",
        borderRadius: "1rem",
        shadow: "card",
      }),
      content: [],
    },
    renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["content"]} />,
    render: ({ content: Content, id, ...chrome }) => (
      <BlockShell id={id} chrome={chrome} as="div">
        <Content />
      </BlockShell>
    ),
  },

  Grid: {
    label: "شبکه چیدمان",
    fields: withChromeFields({
      columns: {
        type: "radio",
        label: "ستون",
        options: [
          { label: "۲", value: "2" },
          { label: "۳", value: "3" },
          { label: "۴", value: "4" },
        ],
      },
      colGap: {
        type: "select",
        label: "فاصله",
        options: [
          { label: "کم", value: "sm" },
          { label: "متوسط", value: "md" },
          { label: "زیاد", value: "lg" },
        ],
      },
      cell1: { type: "slot", label: "خانه ۱" },
      cell2: { type: "slot", label: "خانه ۲" },
      cell3: { type: "slot", label: "خانه ۳" },
      cell4: { type: "slot", label: "خانه ۴" },
    }),
    defaultProps: {
      ...chromeDefaults(),
      columns: "2",
      colGap: "md",
      cell1: [],
      cell2: [],
      cell3: [],
      cell4: [],
    },
    renderFields: ({ fields }) => (
        <StyleFieldTabs fields={fields} content={["columns", "colGap", "cell1", "cell2", "cell3", "cell4"]} />
    ),
    render: ({
      columns,
      colGap,
      cell1: C1,
      cell2: C2,
      cell3: C3,
      cell4: C4,
      id,
      ...chrome
    }) => {
      const n = Number(columns) || 2;
      const g = gapCls[colGap] || gapCls.md;
      const grid =
        n === 4 ? "md:grid-cols-4" : n === 3 ? "md:grid-cols-3" : "md:grid-cols-2";
      return (
        <BlockShell id={id} chrome={chrome} className={`grid grid-cols-1 ${grid} ${g}`}>
          <C1 />
          <C2 />
          {n >= 3 ? <C3 /> : null}
          {n >= 4 ? <C4 /> : null}
        </BlockShell>
      );
    },
  },

  CustomCode: {
    label: "کد سفارشی (HTML/CSS)",
    fields: withChromeFields({
      html: {
        type: "textarea",
        label: "HTML (بدون script)",
      },
      css: {
        type: "textarea",
        label: "CSS اضافی (محدود به همین بلوک — یا از پیشرفته استفاده کنید)",
      },
    }),
    defaultProps: {
      ...chromeDefaults(),
      html: "<div class='note'>محتوای سفارشی</div>",
      css: ".note { font-weight: 600; }",
    },
    renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["html", "css"]} />,
    render: ({ html, css, id, customCss, ...chrome }) => {
      const cleaned = String(html || "")
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/\son\w+=/gi, " data-blocked=")
        .replace(/javascript:/gi, "");
      const mergedCss = [css, customCss].filter(Boolean).join("\n");
      return (
        <BlockShell id={id} chrome={{ ...chrome, customCss: mergedCss }}>
          <div dangerouslySetInnerHTML={{ __html: cleaned }} />
        </BlockShell>
      );
    },
  },

  StickyCta: {
    label: "نوار CTA چسبان",
    fields: withChromeFields({
      text: { type: "text", label: "متن" },
      buttonLabel: { type: "text", label: "متن دکمه" },
      buttonHref: { type: "text", label: "لینک" },
      position: {
        type: "radio",
        label: "موقعیت",
        options: [
          { label: "پایین", value: "bottom" },
          { label: "بالا", value: "top" },
        ],
      },
    }),
    defaultProps: {
      ...chromeDefaults({
        widthMode: "full",
        bgColor: "var(--card)",
        borderWidth: "1px",
        borderColor: "var(--border)",
        padT: "0.75rem",
        padB: "0.75rem",
        padR: "1rem",
        padL: "1rem",
        shadow: "soft",
        zIndex: "40",
      }),
      text: "آماده خریدید؟",
      buttonLabel: "ورود به فروشگاه",
      buttonHref: "/catalog",
      position: "bottom",
    },
    renderFields: ({ fields }) => (
        <StyleFieldTabs fields={fields} content={["text", "buttonLabel", "buttonHref", "position"]} />
    ),
    render: ({ text, buttonLabel, buttonHref, position, id, ...chrome }) => (
      <BlockShell
        id={id}
        chrome={chrome}
        className={
          position === "top"
            ? "sticky top-0"
            : "sticky bottom-0"
        }
        as="div"
      >
        <div className="shop-container flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold">{text}</p>
          {buttonLabel ? (
            <Link
              href={buttonHref || "/catalog"}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-[var(--accent-fg)]"
            >
              {buttonLabel}
            </Link>
          ) : null}
        </div>
      </BlockShell>
    ),
  },

  LogoLockup: {
    label: "لوگو / برند",
    fields: withChromeFields({
      imageUrl: { type: "text", label: "آدرس لوگو" },
      brandName: { type: "text", label: "نام برند" },
      tagline: { type: "text", label: "شعار" },
      href: { type: "text", label: "لینک" },
      logoHeight: { type: "text", label: "ارتفاع لوگو" },
    }),
    defaultProps: {
      ...chromeDefaults({ textAlign: "center", padT: "1rem", padB: "1rem" }),
      imageUrl: "",
      brandName: "دشتستان",
      tagline: "لوازم خانگی با گارانتی اصلی",
      href: "/",
      logoHeight: "48px",
    },
    renderFields: ({ fields }) => (
        <StyleFieldTabs fields={fields} content={["imageUrl", "brandName", "tagline", "href", "logoHeight"]} />
    ),
    render: ({ imageUrl, brandName, tagline, href, logoHeight, id, ...chrome }) => {
      const inner = (
        <div className="inline-flex flex-col items-center gap-2">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={brandName || "لوگو"}
              style={{ height: logoHeight || "48px", width: "auto" }}
            />
          ) : (
            <span className="text-2xl font-bold tracking-tight">{brandName}</span>
          )}
          {tagline ? <span className="text-sm text-muted">{tagline}</span> : null}
        </div>
      );
      return (
        <BlockShell id={id} chrome={chrome}>
          {href ? <Link href={href}>{inner}</Link> : inner}
        </BlockShell>
      );
    },
  },

  SearchCta: {
    label: "جستجو / میانبر کاتالوگ",
    fields: withChromeFields({
      title: { type: "text", label: "عنوان" },
      placeholder: { type: "text", label: "placeholder" },
      buttonLabel: { type: "text", label: "متن دکمه" },
      href: { type: "text", label: "مقصد (معمولاً /catalog یا /browse)" },
    }),
    defaultProps: {
      ...chromeDefaults({
        padT: "1.25rem",
        padB: "1.25rem",
        padR: "1.25rem",
        padL: "1.25rem",
        bgColor: "var(--card)",
        borderRadius: "1rem",
        borderWidth: "1px",
        borderColor: "var(--border)",
      }),
      title: "دنبال چه محصولی هستید؟",
      placeholder: "جستجو در فروشگاه…",
      buttonLabel: "جستجو",
      href: "/catalog",
    },
    renderFields: ({ fields }) => (
        <StyleFieldTabs fields={fields} content={["title", "placeholder", "buttonLabel", "href"]} />
    ),
    render: ({ title, placeholder, buttonLabel, href, id, ...chrome }) => (
      <BlockShell id={id} chrome={chrome} as="section">
        {title ? <h2 className="mb-3 text-lg font-bold">{title}</h2> : null}
        <form action={href || "/catalog"} method="get" className="flex flex-col gap-2 sm:flex-row">
          <input
            name="q"
            placeholder={placeholder}
            className="input-theme min-h-12 flex-1 rounded-xl px-4 text-sm"
          />
          <button
            type="submit"
            className="min-h-12 rounded-xl bg-[var(--accent)] px-6 text-sm font-bold text-[var(--accent-fg)]"
          >
            {buttonLabel}
          </button>
        </form>
      </BlockShell>
    ),
  },

  CategoryCards: {
    label: "کارت دسته‌بندی",
    fields: withChromeFields({
      sourceMode: {
        type: "radio",
        label: "منبع",
        options: [
          { label: "زنده", value: "live" },
          { label: "دستی", value: "manual" },
        ],
      },
      title: { type: "text", label: "عنوان" },
      limit: { type: "number", label: "تعداد", min: 2, max: 24 },
      columns: {
        type: "radio",
        label: "ستون",
        options: [
          { label: "۲", value: "2" },
          { label: "۳", value: "3" },
          { label: "۴", value: "4" },
        ],
      },
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
      ...chromeDefaults({ widthMode: "full", padT: "1rem", padB: "1rem" }),
      sourceMode: "live",
      title: "خرید بر اساس دسته",
      limit: 8,
      columns: "4",
      manualCategories: [],
    },
    renderFields: ({ fields }) => (
        <StyleFieldTabs
        fields={fields}
        content={["sourceMode", "title", "limit", "columns", "manualCategories"]}
      />
    ),
    render: ({
      sourceMode,
      title,
      limit,
      columns,
      manualCategories,
      id,
      puck,
      ...chrome
    }) => {
      const live = meta(puck).categories || [];
      const cats =
        sourceMode === "manual" && manualCategories?.length
          ? manualCategories.map((c, i) => ({
              id: -(i + 1),
              name_fa: c.title,
              path: c.href || `/browse/cat-${i}`,
              image_url: c.imageUrl || null,
            }))
          : live.slice(0, Math.max(1, limit || 8)).map((c) => ({
              id: c.id,
              name_fa: c.name_fa,
              path: c.path || `/browse/${c.slug}`,
              image_url: c.image_url || null,
            }));
      if (!cats.length) {
        return meta(puck).editing ? <EmptyHint>دسته‌ای نیست.</EmptyHint> : <></>;
      }
      const cols =
        columns === "2"
          ? "md:grid-cols-2"
          : columns === "3"
            ? "md:grid-cols-3"
            : "md:grid-cols-4";
      return (
        <BlockShell id={id} chrome={chrome} as="section" className="shop-container">
          {title ? <h2 className="mb-4 text-lg font-bold sm:text-xl">{title}</h2> : null}
          <div className={`grid grid-cols-2 gap-3 ${cols}`}>
            {cats.map((c) => (
              <Link
                key={c.id}
                href={c.path}
                className="group overflow-hidden rounded-2xl border border-theme bg-card transition hover:border-[var(--accent)]/40"
              >
                <div className="aspect-[4/3] bg-[var(--bg)]">
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.image_url}
                      alt=""
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl font-bold text-muted">
                      {c.name_fa.charAt(0)}
                    </div>
                  )}
                </div>
                <p className="p-3 text-sm font-semibold">{c.name_fa}</p>
              </Link>
            ))}
          </div>
        </BlockShell>
      );
    },
  },

  SeparatorLabel: {
    label: "جداکننده با متن",
    fields: withChromeFields({
      label: { type: "text", label: "متن وسط" },
      lineColor: { type: "text", label: "رنگ خط" },
    }),
    defaultProps: {
      ...chromeDefaults({ padT: "1rem", padB: "1rem", textAlign: "center" }),
      label: "یا",
      lineColor: "var(--border)",
    },
    renderFields: ({ fields }) => <StyleFieldTabs fields={fields} content={["label", "lineColor"]} />,
    render: ({ label, lineColor, id, ...chrome }) => (
      <BlockShell id={id} chrome={chrome}>
        <div className="flex items-center gap-3">
          <span
            className="h-px flex-1"
            style={{ background: lineColor || "var(--border)" }}
          />
          <span className="text-xs font-semibold text-muted">{label}</span>
          <span
            className="h-px flex-1"
            style={{ background: lineColor || "var(--border)" }}
          />
        </div>
      </BlockShell>
    ),
  },
};

import type { Metadata } from "next";
import Link from "next/link";
import { Palette, Coffee, Shirt } from "@/components/icons";

import { fetchCustomizerTemplates } from "@/lib/customizer";
import { fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";
import { formatToman } from "@/lib/utils";

export const revalidate = 120;

const ICONS: Record<string, typeof Shirt> = {
  tshirt: Shirt,
  mug: Coffee,
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchShopSettings().catch(() => null);
  const siteUrl = getSiteUrl(settings);
  const shopName = settings?.shop_name ?? BRAND_NAME;

  return buildPageMetadata({
    title: "آزمایشگاه طراحی — سفارشی‌سازی",
    description: `طراحی و سفارش تیشرت، هودی و ماگ اختصاصی در ${shopName}. آپلود طرح، پیش‌نمایش و ثبت در ویترین.`,
    canonical: `${siteUrl}/customize`,
    shopName,
  });
}

export default async function CustomizePage() {
  let templates: Awaited<ReturnType<typeof fetchCustomizerTemplates>> = [];
  let apiError = false;
  try {
    templates = await fetchCustomizerTemplates();
  } catch {
    apiError = true;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-theme px-4 py-1 text-xs text-muted">
          <Palette className="h-3.5 w-3.5" />
          آزمایشگاه طراحی
        </div>
        <h1 className="text-3xl font-semibold">محصول سفارشی خودت را بساز</h1>
        <p className="mt-2 text-muted">
          عکس دلخواهت را آپلود کن، پیش‌نمایش ببین و سفارش بده — در صورت تمایل اثرت را در ویترین ثبت کن
        </p>
      </div>

      {apiError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="font-medium text-red-400">سرور API در دسترس نیست</p>
          <p className="mt-2 text-sm text-muted">
            بک‌اند را اجرا کنید:{" "}
            <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-xs">uvicorn app.main:app</code>
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((t) => {
            const Icon = ICONS[t.slug] ?? Shirt;
            return (
              <Link
                key={t.id}
                href={`/customize/${t.slug}`}
                className="card-theme group flex items-start gap-4 p-5 transition hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium group-hover:text-[var(--accent)]">{t.name_fa}</p>
                  {t.description ? (
                    <p className="mt-1 text-sm text-muted">{t.description}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted">از {formatToman(Number(t.base_price))}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
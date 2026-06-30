import type { Metadata } from "next";
import Link from "next/link";

import { StudioCard } from "@/components/studio/StudioCard";
import { fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";
import { fetchStudios } from "@/lib/studio";

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchShopSettings().catch(() => null);
  const siteUrl = getSiteUrl(settings);
  const shopName = settings?.shop_name ?? BRAND_NAME;

  return buildPageMetadata({
    title: "ویترین خالقین",
    description: `استودیوهای خالقانی که آثارشان در ${shopName} منتشر شده — خرید مستقیم از طراح.`,
    canonical: `${siteUrl}/studios`,
    shopName,
  });
}

export default async function StudiosPage() {
  let studios: Awaited<ReturnType<typeof fetchStudios>>["studios"] = [];
  try {
    const data = await fetchStudios();
    studios = data.studios;
  } catch {
    studios = [];
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border-2 border-[var(--fg)] bg-[var(--bg-elevated)] px-6 py-10 shadow-[6px_6px_0_0_var(--fg)] sm:px-10">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-20 blur-2xl"
          style={{ background: "var(--accent)" }}
          aria-hidden
        />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">ویترین</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">استودیوهای خالقین</h1>
        <p className="mt-3 max-w-xl text-muted">
          هر خالق صفحهٔ خودش را دارد — آثار منتشرشده، رنگ و داستانش را ببینید و مستقیم از استودیویش
          خرید کنید.
        </p>
        <Link
          href="/customize"
          className="mt-6 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
        >
          شما هم در Design Lab اثر بسازید ←
        </Link>
      </div>

      {studios.length === 0 ? (
        <p className="mt-16 text-center text-muted">
          هنوز استودیوی منتشرشده‌ای نیست — به‌زودی پر می‌شود.
        </p>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {studios.map((s, i) => (
            <StudioCard key={s.id} studio={s} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
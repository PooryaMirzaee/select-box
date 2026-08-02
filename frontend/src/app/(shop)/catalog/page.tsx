import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/shop/ProductCard";
import { SearchBar } from "@/components/shop/SearchBar";
import { fetchCategoryNav, fetchProducts, fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { browseHref } from "@/lib/browse-path";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const revalidate = 60;

const PAGE_SIZE = 48;

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

function parsePage(raw?: string) {
  const n = Number.parseInt(raw || "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function pageHref(page: number, query: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/catalog?${qs}` : "/catalog";
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const settings = await fetchShopSettings().catch(() => null);
  const siteUrl = getSiteUrl(settings);
  const shopName = settings?.shop_name ?? BRAND_NAME;
  const query = (q ?? "").trim();

  return buildPageMetadata({
    title: query ? `جستجو: ${query}` : "همه محصولات",
    description: `خرید لوازم خانگی و سبک زندگی از ${shopName} — گارانتی اصلی و ارسال سریع.`,
    canonical: query ? `${siteUrl}/catalog?q=${encodeURIComponent(query)}` : `${siteUrl}/catalog`,
    shopName,
    noindex: Boolean(query),
  });
}

export default async function CatalogPage({ searchParams }: Props) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim();
  const page = parsePage(sp.page);
  const offset = (page - 1) * PAGE_SIZE;

  const [list, categoryNav, settings] = await Promise.all([
    fetchProducts(undefined, query || undefined, { limit: PAGE_SIZE, offset }).catch(() => ({
      items: [],
      total: 0,
      limit: PAGE_SIZE,
      offset,
    })),
    fetchCategoryNav().catch(() => []),
    fetchShopSettings().catch(() => null),
  ]);

  const products = list.items;
  const total = list.total;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const shopName = settings?.shop_name ?? BRAND_NAME;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + products.length, total);

  return (
    <>
      <section className="relative overflow-hidden border-b border-theme bg-[var(--bg-elevated)]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,var(--accent-soft),transparent_50%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <p className="text-xs font-medium tracking-wide text-[var(--accent)]">{shopName}</p>
          <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
            {query ? `نتایج «${query}»` : "همه محصولات"}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted">
            {query
              ? `${total.toLocaleString("fa-IR")} محصول پیدا شد`
              : `${total.toLocaleString("fa-IR")} کالا آماده خرید — صفحه به صفحه مرور کنید`}
          </p>
          <SearchBar className="mt-5 max-w-md md:hidden" />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          <Link href="/catalog" className={`chip-theme shrink-0 ${!query ? "is-active" : ""}`}>
            همه محصولات
          </Link>
          <Link href="/browse" className="chip-theme shrink-0">
            دسته‌بندی‌ها
          </Link>
          {categoryNav.map((cat) => (
            <Link key={cat.id} href={browseHref(cat.path)} className="chip-theme shrink-0">
              {cat.name_fa}
            </Link>
          ))}
          {query ? (
            <Link href="/catalog" className="chip-theme is-active shrink-0">
              حذف جستجو
            </Link>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted">
          <p>
            {total > 0
              ? `نمایش ${from.toLocaleString("fa-IR")} تا ${to.toLocaleString("fa-IR")} از ${total.toLocaleString("fa-IR")} کالا`
              : "کالایی نیست"}
          </p>
          <Link href="/browse" className="text-[var(--accent)] transition hover:opacity-80">
            مرور بر اساس دسته ←
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-2xl border border-dashed border-theme bg-[var(--bg-elevated)] px-6 py-16 text-center">
            <p className="font-display text-lg">
              {query ? `برای «${query}» چیزی پیدا نشد` : "محصولی یافت نشد"}
            </p>
            <p className="mt-2 text-sm text-muted">عبارت دیگری امتحان کنید یا از دسته‌ها وارد شوید.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {query ? (
                <Link
                  href="/catalog"
                  className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--accent)] px-6 text-sm font-medium text-[var(--accent-fg)]"
                >
                  مشاهده همه محصولات
                </Link>
              ) : null}
              <Link
                href="/browse"
                className="inline-flex min-h-[44px] items-center rounded-full border border-theme px-6 text-sm"
              >
                دسته‌بندی‌ها
              </Link>
            </div>
          </div>
        )}

        {totalPages > 1 ? (
          <nav
            className="mt-10 flex flex-wrap items-center justify-center gap-2"
            aria-label="صفحه‌بندی محصولات"
          >
            <Link
              href={pageHref(Math.max(1, safePage - 1), query)}
              className={cn(
                "chip-theme shrink-0",
                safePage <= 1 && "pointer-events-none opacity-40",
              )}
              aria-disabled={safePage <= 1}
            >
              قبلی
            </Link>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0) {
                  const prev = arr[idx - 1]!;
                  if (p - prev > 1) acc.push("…");
                }
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === "…" ? (
                  <span key={`e-${idx}`} className="px-1 text-muted">
                    …
                  </span>
                ) : (
                  <Link
                    key={p}
                    href={pageHref(p, query)}
                    className={cn("chip-theme min-w-[2.75rem] justify-center shrink-0", p === safePage && "is-active")}
                    aria-current={p === safePage ? "page" : undefined}
                  >
                    {p.toLocaleString("fa-IR")}
                  </Link>
                ),
              )}
            <Link
              href={pageHref(Math.min(totalPages, safePage + 1), query)}
              className={cn(
                "chip-theme shrink-0",
                safePage >= totalPages && "pointer-events-none opacity-40",
              )}
              aria-disabled={safePage >= totalPages}
            >
              بعدی
            </Link>
          </nav>
        ) : null}
      </div>
    </>
  );
}

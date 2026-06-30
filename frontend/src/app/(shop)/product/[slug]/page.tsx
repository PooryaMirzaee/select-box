import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCart } from "@/components/shop/AddToCart";
import { ProductCreator } from "@/components/shop/ProductCreator";
import { Breadcrumbs, type Crumb } from "@/components/shop/Breadcrumbs";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { ProductJsonLd } from "@/components/seo/ProductJsonLd";
import { fetchProduct, fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";
import { formatToman } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [p, settings] = await Promise.all([
    fetchProduct(slug),
    fetchShopSettings().catch(() => null),
  ]);
  if (!p) return { title: "محصول یافت نشد", robots: { index: false, follow: false } };
  const siteUrl = getSiteUrl(settings);
  const url = `${siteUrl}/product/${p.slug}`;
  const title = p.meta_title ?? p.title;
  const description = p.meta_description ?? p.description ?? undefined;
  const shopName = settings?.shop_name ?? BRAND_NAME;

  return buildPageMetadata({
    title,
    description,
    canonical: url,
    shopName,
    ogImage: p.image_urls[0] ?? null,
    ogImageAlt: p.title,
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [p, settings] = await Promise.all([
    fetchProduct(slug),
    fetchShopSettings().catch(() => null),
  ]);
  if (!p) notFound();
  const siteUrl = getSiteUrl(settings);

  const crumbs: Crumb[] = (p.breadcrumbs ?? []).map((b) => ({
    name_fa: b.name_fa,
    path: b.path,
  }));

  return (
    <>
      <ProductJsonLd product={p} siteUrl={siteUrl} />
      <BreadcrumbJsonLd items={p.breadcrumbs ?? []} siteUrl={siteUrl} />
      <article className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <Breadcrumbs items={crumbs} />
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <ProductGallery images={p.image_urls} title={p.title} />
          <div className="flex flex-col gap-4">
            <p className="text-xs text-muted">{p.design_title}</p>
            <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{p.title}</h1>
            {p.description ? (
              <p className="text-sm leading-relaxed text-muted">{p.description}</p>
            ) : p.meta_description ? (
              <p className="text-sm leading-relaxed text-muted">{p.meta_description}</p>
            ) : null}
            {p.creator ? <ProductCreator creator={p.creator} /> : null}
            <AddToCart product={p} />
            {p.related.length > 0 ? (
              <section className="mt-6 border-t border-theme pt-6">
                <h2 className="mb-3 text-sm font-medium text-muted">سایر محصولات این طرح</h2>
                <div className="grid gap-2">
                  {p.related.map((r) => (
                    <Link
                      key={r.id}
                      href={`/product/${r.slug}`}
                      className="min-h-[52px] rounded-xl border border-theme px-4 py-3 transition hover:border-[var(--accent)]/40"
                    >
                      <p className="text-sm font-medium">{r.title}</p>
                      <p className="text-xs text-muted">{formatToman(r.base_price)}</p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </article>
    </>
  );
}

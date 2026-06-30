import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/shop/ProductCard";
import { fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";
import { fetchStudioProfile } from "@/lib/studio";
import { mediaUrl } from "@/lib/media";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const settings = await fetchShopSettings().catch(() => null);
  const siteUrl = getSiteUrl(settings);
  const shopName = settings?.shop_name ?? BRAND_NAME;

  try {
    const data = await fetchStudioProfile(slug);
    const title = `استودیوی ${data.studio.display_name}`;
    const description = data.studio.tagline ?? data.studio.bio ?? undefined;
    const canonical = `${siteUrl}/studio/${slug}`;

    return buildPageMetadata({
      title,
      description,
      canonical,
      shopName,
      ogImage: data.studio.avatar_url ?? data.studio.preview_image_url ?? null,
      ogImageAlt: data.studio.display_name,
    });
  } catch {
    return { title: "استودیو", robots: { index: false, follow: false } };
  }
}

export default async function StudioPage({ params }: Props) {
  const { slug } = await params;

  let data: Awaited<ReturnType<typeof fetchStudioProfile>>;
  try {
    data = await fetchStudioProfile(slug);
  } catch {
    notFound();
  }

  const { studio, products } = data;
  const accent = studio.accent_hex || "#c45c26";
  const headerSrc = mediaUrl(studio.header_url) ?? studio.header_url;
  const avatarSrc = mediaUrl(studio.avatar_url) ?? studio.avatar_url;

  return (
    <div className="pb-16">
      <div className="relative border-b-2 border-[var(--fg)]">
        <div className={`relative h-40 sm:h-52 md:h-60 ${headerSrc ? "" : ""}`}>
          {headerSrc ? (
            <img
              src={headerSrc}
              alt={`کاور استودیوی ${studio.display_name}`}
              className="h-full w-full object-cover"
            />
          ) : null}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-transparent"
            aria-hidden
          />
        </div>

        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative -mt-14 flex flex-col gap-4 pb-8 sm:-mt-16 sm:flex-row sm:items-end sm:gap-6">
            <div
              className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-[var(--fg)] bg-[var(--bg-elevated)] shadow-[4px_4px_0_0_var(--fg)] sm:h-28 sm:w-28"
              style={{ boxShadow: `4px 4px 0 0 var(--fg), 0 0 0 3px ${accent}40` }}
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt={studio.display_name} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-3xl font-bold"
                  style={{ color: accent }}
                >
                  {studio.display_name.charAt(0)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted">استودیو</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-4xl">{studio.display_name}</h1>
              {studio.tagline ? (
                <p className="mt-2 text-base text-muted sm:text-lg">{studio.tagline}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted">
                {studio.product_count > 0
                  ? `${studio.product_count} اثر در ویترین`
                  : "در حال آماده‌سازی ویترین"}
              </p>
            </div>
          </div>

          {studio.bio ? (
            <p className="max-w-2xl pb-8 text-sm leading-relaxed text-[var(--fg)]/90 whitespace-pre-wrap">
              {studio.bio}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="text-xl font-semibold">آثار در ویترین</h2>

        {products.length === 0 ? (
          <p className="mt-8 text-center text-muted">هنوز اثری در ویترین منتشر نشده است.</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        <div className="mt-12 flex flex-wrap gap-4 text-sm">
          <Link href="/studios" className="text-[var(--accent)] hover:underline">
            ← همه استودیوها
          </Link>
          <Link href="/catalog" className="text-muted hover:text-[var(--fg)]">
            فروشگاه
          </Link>
        </div>
      </div>
    </div>
  );
}
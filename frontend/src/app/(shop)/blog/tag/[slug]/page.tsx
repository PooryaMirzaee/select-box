import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogListing } from "@/components/blog/BlogListing";
import { fetchBlogCategories, fetchBlogPosts, fetchBlogTags, type BlogTag } from "@/lib/blog";
import { fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";

export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const tags = await fetchBlogTags().catch(() => []);
  const tag = tags.find((t: BlogTag) => t.slug === slug);
  if (!tag) return { title: "برچسب یافت نشد", robots: { index: false, follow: false } };

  const settings = await fetchShopSettings().catch(() => null);
  const siteUrl = getSiteUrl(settings);
  const shopName = settings?.shop_name ?? BRAND_NAME;

  return buildPageMetadata({
    title: `#${tag.name_fa}`,
    description: `مقالات با برچسب ${tag.name_fa}`,
    canonical: `${siteUrl}/blog/tag/${slug}`,
    shopName,
    noindex: page > 1,
  });
}

export default async function BlogTagPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  const [tags, categories] = await Promise.all([
    fetchBlogTags().catch(() => []),
    fetchBlogCategories().catch(() => []),
  ]);
  const tag = tags.find((t: BlogTag) => t.slug === slug);
  if (!tag) notFound();

  const data = await fetchBlogPosts({ page, page_size: 12, tag: slug }).catch(() => ({
    items: [],
    total: 0,
    page: 1,
    page_size: 12,
  }));

  return (
    <BlogListing
      posts={data.items}
      categories={categories}
      total={data.total}
      page={data.page}
      pageSize={data.page_size}
      activeTag={slug}
      title={`#${tag.name_fa}`}
      subtitle={`مقالات با برچسب ${tag.name_fa}`}
      basePath="/blog"
    />
  );
}
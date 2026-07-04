import type { Metadata } from "next";

import { BlogListing } from "@/components/blog/BlogListing";
import { fetchBlogCategories, fetchBlogPosts } from "@/lib/blog";
import { fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";

export const revalidate = 60;

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);
  const settings = await fetchShopSettings().catch(() => null);
  const siteUrl = getSiteUrl(settings);
  const shopName = settings?.shop_name ?? BRAND_NAME;
  const title = `مجله — ${shopName}`;
  const description = "راهنمای خرید لوازم خانگی، نکات نگهداری و سبک زندگی.";

  return buildPageMetadata({
    title,
    description,
    canonical: `${siteUrl}/blog`,
    shopName,
    noindex: page > 1,
  });
}

export default async function BlogPage({ searchParams }: Props) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  const [data, categories] = await Promise.all([
    fetchBlogPosts({ page, page_size: 12 }).catch(() => ({
      items: [],
      total: 0,
      page: 1,
      page_size: 12,
    })),
    fetchBlogCategories().catch(() => []),
  ]);

  return (
    <BlogListing
      posts={data.items}
      categories={categories}
      total={data.total}
      page={data.page}
      pageSize={data.page_size}
    />
  );
}

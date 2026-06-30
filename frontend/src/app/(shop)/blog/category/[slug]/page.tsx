import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogListing } from "@/components/blog/BlogListing";
import { fetchBlogCategories, fetchBlogPosts, type BlogCategory } from "@/lib/blog";
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
  const categories = await fetchBlogCategories().catch(() => []);
  const cat = categories.find((c: BlogCategory) => c.slug === slug);
  if (!cat) return { title: "دسته یافت نشد", robots: { index: false, follow: false } };

  const settings = await fetchShopSettings().catch(() => null);
  const siteUrl = getSiteUrl(settings);
  const shopName = settings?.shop_name ?? BRAND_NAME;

  return buildPageMetadata({
    title: cat.name_fa,
    description: cat.description ?? `مقالات دسته ${cat.name_fa}`,
    canonical: `${siteUrl}/blog/category/${slug}`,
    shopName,
    noindex: page > 1,
  });
}

export default async function BlogCategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  const categories = await fetchBlogCategories().catch(() => []);
  const cat = categories.find((c: BlogCategory) => c.slug === slug);
  if (!cat) notFound();

  const data = await fetchBlogPosts({ page, page_size: 12, category: slug }).catch(() => ({
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
      activeCategory={slug}
      title={cat.name_fa}
      subtitle={cat.description ?? `مقالات دسته ${cat.name_fa}`}
      basePath="/blog"
    />
  );
}
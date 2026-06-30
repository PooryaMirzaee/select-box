import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleJsonLd } from "@/components/seo/ArticleJsonLd";
import { BlogPostView } from "@/components/blog/BlogPostView";
import { fetchBlogPost } from "@/lib/blog";
import { fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";

export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchBlogPost(slug).catch(() => null);
  if (!post) return { title: "مقاله یافت نشد", robots: { index: false, follow: false } };

  const settings = await fetchShopSettings().catch(() => null);
  const siteUrl = getSiteUrl(settings);
  const shopName = settings?.shop_name ?? BRAND_NAME;
  const title = post.meta_title ?? post.title;
  const description = post.meta_description ?? post.excerpt ?? undefined;

  return buildPageMetadata({
    title,
    description,
    canonical: `${siteUrl}/blog/${slug}`,
    shopName,
    ogType: "article",
    ogImage: post.cover_image_url ?? null,
    ogImageAlt: post.title,
    publishedTime: post.published_at ?? undefined,
    authors: post.author ? [post.author.display_name] : undefined,
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const [post, settings] = await Promise.all([
    fetchBlogPost(slug).catch(() => null),
    fetchShopSettings().catch(() => null),
  ]);
  if (!post) notFound();

  const siteUrl = getSiteUrl(settings);
  const shopName = settings?.shop_name ?? BRAND_NAME;

  return (
    <>
      <ArticleJsonLd post={post} siteUrl={siteUrl} shopName={shopName} />
      <BlogPostView post={post} />
    </>
  );
}

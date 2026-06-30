import type { MetadataRoute } from "next";

import { fetchProductSlugs, fetchSitemapPaths, fetchShopSettings } from "@/lib/api";
import { fetchBlogCategories, fetchBlogSlugs, fetchBlogTags } from "@/lib/blog";
import { fetchStudios } from "@/lib/studio";
import { getSiteUrl } from "@/lib/seo";
import { studioPath } from "@/lib/studio";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await fetchShopSettings().catch(() => null);
  const siteUrl = getSiteUrl(settings);
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/browse`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/catalog`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/customize`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${siteUrl}/studios`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/business`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${siteUrl}/business/tshirt`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/business/hoodie`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/business/mug`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
  ];

  let categoryPaths: string[] = [];
  try {
    const res = await fetchSitemapPaths();
    categoryPaths = res.paths ?? [];
  } catch {
    categoryPaths = [];
  }

  const browseRoutes: MetadataRoute.Sitemap = categoryPaths.map((p) => ({
    url: `${siteUrl}/browse/${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  let slugs: string[] = [];
  try {
    slugs = await fetchProductSlugs();
  } catch {
    slugs = [];
  }

  const productRoutes: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${siteUrl}/product/${slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  let blogSlugs: string[] = [];
  try {
    const res = await fetchBlogSlugs();
    blogSlugs = res.slugs ?? [];
  } catch {
    blogSlugs = [];
  }

  const blogRoutes: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
    url: `${siteUrl}/blog/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  let blogCategoryRoutes: MetadataRoute.Sitemap = [];
  try {
    const categories = await fetchBlogCategories();
    blogCategoryRoutes = categories.map((c) => ({
      url: `${siteUrl}/blog/category/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    blogCategoryRoutes = [];
  }

  let blogTagRoutes: MetadataRoute.Sitemap = [];
  try {
    const tags = await fetchBlogTags();
    blogTagRoutes = tags.map((t) => ({
      url: `${siteUrl}/blog/tag/${t.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));
  } catch {
    blogTagRoutes = [];
  }

  let studioRoutes: MetadataRoute.Sitemap = [];
  try {
    const { studios } = await fetchStudios();
    studioRoutes = studios.map((s) => ({
      url: `${siteUrl}${studioPath(s)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.65,
    }));
  } catch {
    studioRoutes = [];
  }

  return [
    ...staticRoutes,
    ...browseRoutes,
    ...productRoutes,
    ...blogRoutes,
    ...blogCategoryRoutes,
    ...blogTagRoutes,
    ...studioRoutes,
  ];
}

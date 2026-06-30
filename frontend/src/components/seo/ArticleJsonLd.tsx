import type { BlogPostDetail } from "@/lib/blog";
import { JsonLdScript } from "@/components/seo/JsonLdScript";

export function ArticleJsonLd({
  post,
  siteUrl,
  shopName,
}: {
  post: BlogPostDetail;
  siteUrl: string;
  shopName: string;
}) {
  const url = `${siteUrl}/blog/${post.slug}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.meta_description ?? post.excerpt ?? undefined,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    inLanguage: "fa-IR",
    ...(post.cover_image_url
      ? { image: [post.cover_image_url] }
      : {}),
    ...(post.published_at ? { datePublished: post.published_at } : {}),
    ...(post.published_at ? { dateModified: post.published_at } : {}),
    ...(post.author
      ? {
          author: {
            "@type": "Person",
            name: post.author.display_name,
          },
        }
      : {}),
    publisher: {
      "@type": "Organization",
      name: shopName,
      url: siteUrl,
    },
    ...(post.reading_time_minutes
      ? { timeRequired: `PT${post.reading_time_minutes}M` }
      : {}),
  };
  return <JsonLdScript data={schema} />;
}

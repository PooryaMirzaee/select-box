import type { BreadcrumbItem } from "@/lib/api";

export function BreadcrumbJsonLd({ items, siteUrl }: { items: BreadcrumbItem[]; siteUrl: string }) {
  if (!items.length) return null;
  const list = [
    { name: "فروشگاه", item: `${siteUrl}/browse` },
    ...items.map((c) => ({
      name: c.name_fa,
      item: c.path.startsWith("product/")
        ? `${siteUrl}/${c.path}`
        : `${siteUrl}/browse/${c.path}`,
    })),
  ];
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: list.map((el, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: el.name,
      item: el.item,
    })),
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  );
}

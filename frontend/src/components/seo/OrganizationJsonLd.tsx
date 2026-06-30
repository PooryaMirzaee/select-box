import { JsonLdScript } from "@/components/seo/JsonLdScript";

/** @deprecated از OnlineStoreJsonLd در WebSiteJsonLd.tsx استفاده کنید */
export function OrganizationJsonLd({ siteUrl, name }: { siteUrl: string; name: string }) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: siteUrl,
  };
  return <JsonLdScript data={schema} />;
}

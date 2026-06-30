import { JsonLdScript } from "@/components/seo/JsonLdScript";

export function WebSiteJsonLd({
  siteUrl,
  name,
  description,
}: {
  siteUrl: string;
  name: string;
  description?: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url: siteUrl,
    ...(description ? { description } : {}),
    inLanguage: "fa-IR",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/catalog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
  return <JsonLdScript data={schema} />;
}

export function OnlineStoreJsonLd({
  siteUrl,
  name,
  description,
  logoUrl,
  sameAs = [],
  contact,
}: {
  siteUrl: string;
  name: string;
  description?: string;
  logoUrl: string;
  sameAs?: string[];
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
  };
}) {
  const contactPoint =
    contact?.phone || contact?.email
      ? {
          "@type": "ContactPoint",
          contactType: "customer service",
          availableLanguage: ["Persian", "fa"],
          ...(contact.phone ? { telephone: contact.phone } : {}),
          ...(contact.email ? { email: contact.email } : {}),
        }
      : undefined;

  const schema = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name,
    url: siteUrl,
    ...(description ? { description } : {}),
    logo: logoUrl,
    ...(sameAs.length ? { sameAs } : {}),
    ...(contactPoint ? { contactPoint } : {}),
    ...(contact?.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: contact.address,
            addressCountry: "IR",
          },
        }
      : {}),
  };
  return <JsonLdScript data={schema} />;
}

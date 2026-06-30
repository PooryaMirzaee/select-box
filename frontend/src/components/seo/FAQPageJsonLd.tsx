import type { BusinessFaq } from "@/lib/api";
import { JsonLdScript } from "@/components/seo/JsonLdScript";

export function FAQPageJsonLd({ faqs }: { faqs: BusinessFaq[] }) {
  if (!faqs.length) return null;
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
  return <JsonLdScript data={schema} />;
}

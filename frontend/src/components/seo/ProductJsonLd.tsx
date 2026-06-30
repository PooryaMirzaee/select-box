import type { ProductDetail } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { JsonLdScript } from "@/components/seo/JsonLdScript";

export function ProductJsonLd({ product, siteUrl }: { product: ProductDetail; siteUrl: string }) {
  const url = `${siteUrl}/product/${product.slug}`;
  const images = product.image_urls.length ? product.image_urls : undefined;
  const price = Math.round(Number(product.effective_price));

  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.meta_description ?? product.description ?? product.title,
    url,
    image: images,
    sku: product.default_sku ?? undefined,
    ...(product.default_sku ? { mpn: product.default_sku } : {}),
    brand: { "@type": "Brand", name: BRAND_NAME },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "IRT",
      price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      itemCondition: "https://schema.org/NewCondition",
      availability: product.in_stock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: BRAND_NAME },
    },
  };

  return <JsonLdScript data={data} />;
}

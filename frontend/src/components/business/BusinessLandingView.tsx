import type { BusinessLanding, ProductSummary } from "@/lib/api";

import { BusinessFAQ } from "./BusinessFAQ";
import { FAQPageJsonLd } from "@/components/seo/FAQPageJsonLd";
import { BusinessFeatures } from "./BusinessFeatures";
import { BusinessGallery, type GallerySample } from "./BusinessGallery";
import { BusinessHero } from "./BusinessHero";
import { BusinessPricing } from "./BusinessPricing";
import { BusinessProductCards } from "./BusinessProductCards";
import { BusinessQuoteForm } from "./BusinessQuoteForm";
import { BusinessProcess, BusinessUseCases } from "./BusinessSections";
import { BusinessTrust } from "./BusinessTrust";

type Props = {
  landing: BusinessLanding;
  productLandings?: BusinessLanding[];
  productType?: string;
  showProductCards?: boolean;
  catalogSamples?: ProductSummary[];
};

function toGallerySamples(products: ProductSummary[]): GallerySample[] {
  return products
    .filter((p) => p.image_url)
    .slice(0, 8)
    .map((p) => ({ image_url: p.image_url!, caption_fa: p.title }));
}

export function BusinessLandingView({
  landing,
  productLandings = [],
  productType,
  showProductCards = false,
  catalogSamples = [],
}: Props) {
  const resolvedType = productType ?? landing.slug;
  const formProductType = resolvedType !== "hub" ? resolvedType : "mixed";

  const quoteForm = (
    <BusinessQuoteForm
      defaultProductType={formProductType}
      landingSlug={landing.slug}
      minOrderQty={landing.min_order_qty}
    />
  );

  return (
    <>
      <FAQPageJsonLd faqs={landing.faqs} />
      <BusinessHero landing={landing} productType={resolvedType} quoteForm={quoteForm} />

      {showProductCards && productLandings.length ? (
        <BusinessProductCards landings={productLandings} />
      ) : null}

      <BusinessGallery
        title={landing.gallery_title}
        items={landing.gallery_images}
        samples={toGallerySamples(catalogSamples)}
      />

      <BusinessTrust
        sectionTitle={landing.trust_section_title}
        logos={landing.trust_logos}
        badges={landing.trust_badges}
        testimonials={landing.testimonials}
      />

      <BusinessFeatures features={landing.features} />
      <BusinessPricing tiers={landing.pricing_tiers} minOrderQty={landing.min_order_qty} />
      <BusinessUseCases useCases={landing.use_cases} />
      <BusinessProcess steps={landing.process_steps} />
      <BusinessFAQ faqs={landing.faqs} />

      <section className="border-t border-theme bg-[var(--bg-elevated)] lg:hidden">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <BusinessQuoteForm
            defaultProductType={formProductType}
            landingSlug={landing.slug}
            minOrderQty={landing.min_order_qty}
            compact
          />
        </div>
      </section>
    </>
  );
}

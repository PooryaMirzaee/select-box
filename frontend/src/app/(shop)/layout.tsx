import { Footer } from "@/components/shop/Footer";
import { Header } from "@/components/shop/Header";
import { MobileNav } from "@/components/shop/MobileNav";
import { ContactTopBar } from "@/components/shop/ShopContact";
import { ShopShell } from "@/components/shop/ShopShell";
import { OnlineStoreJsonLd } from "@/components/seo/WebSiteJsonLd";
import { fetchCategoryNav, fetchHeaderNav, fetchShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { pickContactInfo } from "@/lib/contact";
import { absoluteUrl, getSiteUrl, socialSameAs } from "@/lib/seo";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [settings, categoryNav, headerNav] = await Promise.all([
    fetchShopSettings().catch(() => null),
    fetchCategoryNav().catch(() => []),
    fetchHeaderNav().catch(() => []),
  ]);
  const siteUrl = getSiteUrl(settings);
  const shopName = settings?.shop_name ?? BRAND_NAME;
  const contact = pickContactInfo(settings);

  return (
    <ShopShell>
      <OnlineStoreJsonLd
        siteUrl={siteUrl}
        name={shopName}
        description={settings?.shop_description ?? settings?.default_meta_description}
        logoUrl={absoluteUrl(siteUrl, "/brand/coralay-logo.png")}
        sameAs={socialSameAs(settings)}
        contact={{
          phone: contact.contact_phone || undefined,
          email: contact.contact_email || undefined,
          address: contact.contact_address || undefined,
        }}
      />
      <ContactTopBar contact={settings} />
      <Header categoryNav={categoryNav} headerNav={headerNav} contact={settings} />
      <main id="main-content" className="pb-mobile-nav min-h-[calc(100vh-4rem)]">
        {children}
      </main>
      <Footer settings={settings} />
      <MobileNav />
    </ShopShell>
  );
}

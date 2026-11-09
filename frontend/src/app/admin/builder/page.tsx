"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { PuckEditorClient } from "@/components/admin/builder/PuckEditorClient";
import { fetchBrowse, fetchHomeBanners, fetchProducts } from "@/lib/api";
import { setAdminToken } from "@/lib/cart-session";
import { adminToken, fetchBuilderPage, isAuthError } from "@/lib/page-builder";
import { DEFAULT_APPEARANCE } from "@/puck/appearance";
import { DEFAULT_HOME_PUCK_DATA } from "@/puck/default-data";
import type { PageBuilderPublic, PuckMetadata } from "@/puck/types";

export default function AdminBuilderPage() {
  const router = useRouter();
  const [bundle, setBundle] = useState<PageBuilderPublic | null>(null);
  const [metadata, setMetadata] = useState<PuckMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = adminToken();
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    (async () => {
      try {
        const [page, browse, hero, promo, products] = await Promise.all([
          fetchBuilderPage(token),
          fetchBrowse("").catch(() => null),
          fetchHomeBanners("hero").catch(() => []),
          fetchHomeBanners("promo").catch(() => []),
          fetchProducts(undefined, undefined, { limit: 24 }).catch(() => ({ items: [] })),
        ]);
        const items = products.items || [];
        setBundle({
          ...page,
          data: (page.data as PageBuilderPublic["data"]) || DEFAULT_HOME_PUCK_DATA,
          appearance: page.appearance || DEFAULT_APPEARANCE,
        });
        setMetadata({
          heroBanners: hero,
          promoBanners: promo,
          categories: browse?.children ?? [],
          productsLatest: items,
          productsAmazing: items.slice(0, 10),
          editing: true,
        });
      } catch (e) {
        if (isAuthError(e)) {
          setAdminToken(null);
          router.replace("/admin/login");
          return;
        }
        setError(e instanceof Error ? e.message : "بارگذاری ناموفق");
      }
    })();
  }, [router]);

  if (error) {
    return (
      <div className="space-y-3 p-8 text-sm" dir="rtl">
        <p className="text-danger">{error}</p>
        <button
          type="button"
          className="rounded-lg border border-theme px-4 py-2"
          onClick={() => window.location.reload()}
        >
          تلاش مجدد
        </button>
      </div>
    );
  }
  if (!bundle || !metadata) {
    return (
      <div className="flex h-[100dvh] items-center justify-center text-sm text-muted" dir="rtl">
        در حال بارگذاری صفحه‌ساز…
      </div>
    );
  }

  return <PuckEditorClient initial={bundle} metadata={metadata} />;
}

import { adminFetch } from "@/lib/api";
import { STORAGE_KEYS } from "@/lib/storage-keys";

export function adminToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEYS.adminToken) || "";
}

export function isAuthError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err || "");
  return /نشست|منقضی|Unauthorized|401|403|احراز|ورود/i.test(msg);
}

/** تازه کردن کش صفحه اصلی پس از انتشار */
export async function revalidateShopCache(token: string, extraTags: string[] = []) {
  const tags = [
    "page-builder",
    "page-builder-home",
    "theme-appearance",
    "homepage",
    "home-banners",
    "home-banners-all",
    ...extraTags,
  ];
  await fetch("/api/admin/revalidate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tags, paths: ["/"] }),
  });
}

export async function fetchBuilderPage(token: string) {
  return adminFetch<import("@/puck/types").PageBuilderPublic>(
    "/api/v1/admin/page-builder/pages/home",
    token,
  );
}

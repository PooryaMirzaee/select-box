import { adminFetch } from "@/lib/api";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import type { PageBuilderListItem, PageBuilderPublic } from "@/puck/types";

export function adminToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEYS.adminToken) || "";
}

export function isAuthError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err || "");
  return /نشست|منقضی|Unauthorized|401|403|احراز|ورود/i.test(msg);
}

/** تازه کردن کش صفحه پس از انتشار */
export async function revalidateShopCache(
  token: string,
  slug = "home",
  extraTags: string[] = [],
) {
  const tags = [
    "page-builder",
    "page-builder-home",
    `page-builder-${slug}`,
    "theme-appearance",
    "homepage",
    "home-banners",
    "home-banners-all",
    ...extraTags,
  ];
  const paths = slug === "home" ? ["/"] : ["/", `/p/${slug}`];
  await fetch("/api/admin/revalidate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tags, paths }),
  });
}

export async function fetchBuilderPage(token: string, slug = "home") {
  return adminFetch<PageBuilderPublic>(
    `/api/v1/admin/page-builder/pages/${encodeURIComponent(slug)}`,
    token,
  );
}

export async function fetchBuilderPages(token: string) {
  return adminFetch<PageBuilderListItem[]>("/api/v1/admin/page-builder/pages", token);
}

export async function createBuilderPage(
  token: string,
  body: { slug: string; title: string; published?: boolean },
) {
  return adminFetch<PageBuilderPublic>("/api/v1/admin/page-builder/pages", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteBuilderPage(token: string, slug: string) {
  return adminFetch<{ status: string; slug: string }>(
    `/api/v1/admin/page-builder/pages/${encodeURIComponent(slug)}`,
    token,
    { method: "DELETE" },
  );
}

/**
 * استودیوی خالق — ویترین عمومی و داشبورد
 */

import type { ProductSummary } from "@/lib/api";
import { apiBase } from "@/lib/api-base";

const API_URL = apiBase();

export type StudioPublic = {
  id: number;
  display_name: string;
  studio_slug: string;
  bio: string | null;
  tagline: string | null;
  accent_hex: string;
  product_count: number;
  preview_image_url: string | null;
  avatar_url: string | null;
  header_url: string | null;
};

export type MyStudio = {
  profile: StudioPublic;
  full_name: string | null;
  phone: string;
  public_path: string;
  published_count: number;
  pending_count: number;
  total_products: number;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export function fetchStudios() {
  return apiFetch<{ studios: StudioPublic[] }>("/api/v1/catalog/studios", {
    next: { revalidate: 120 },
  } as RequestInit);
}

export function fetchStudioProfile(slugOrId: string) {
  const enc = encodeURIComponent(slugOrId);
  return apiFetch<{ studio: StudioPublic; products: ProductSummary[] }>(
    `/api/v1/catalog/studios/${enc}`,
    { next: { revalidate: 60 } } as RequestInit,
  );
}

export async function fetchMyStudio(token: string) {
  const res = await fetch(`${API_URL}/api/v1/customizer/my-studio`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<MyStudio>;
}

export async function updateMyStudio(
  token: string,
  body: {
    full_name?: string | null;
    studio_slug?: string;
    studio_bio?: string | null;
    studio_tagline?: string | null;
    studio_accent_hex?: string;
  },
) {
  const res = await fetch(`${API_URL}/api/v1/customizer/my-studio`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = await res.text();
    try {
      const j = JSON.parse(detail) as { detail?: string };
      if (typeof j.detail === "string") detail = j.detail;
    } catch {
      /* plain */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<MyStudio>;
}

export function studioPath(studio: { studio_slug: string; id: number }) {
  return `/studio/${studio.studio_slug || studio.id}`;
}

export async function uploadStudioAvatar(token: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/v1/customizer/my-studio/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    let detail = await res.text();
    try {
      const j = JSON.parse(detail) as { detail?: string };
      if (typeof j.detail === "string") detail = j.detail;
    } catch {
      /* plain */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<MyStudio>;
}

export async function uploadStudioHeader(token: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/v1/customizer/my-studio/header`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    let detail = await res.text();
    try {
      const j = JSON.parse(detail) as { detail?: string };
      if (typeof j.detail === "string") detail = j.detail;
    } catch {
      /* plain */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<MyStudio>;
}

export async function removeStudioAvatar(token: string) {
  const res = await fetch(`${API_URL}/api/v1/customizer/my-studio/avatar`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<MyStudio>;
}

export async function removeStudioHeader(token: string) {
  const res = await fetch(`${API_URL}/api/v1/customizer/my-studio/header`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<MyStudio>;
}

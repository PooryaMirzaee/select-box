/**
 * تایپ‌ها و کلاینت API سفارشی‌سازی
 */

import { apiBase } from "@/lib/api-base";
import { mediaUrl } from "@/lib/media";

export type CustomizationTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type CustomizationPayload = {
  product_type: string;
  artwork_url: string;
  artwork_storage_key: string;
  color_hex: string;
  color_name: string;
  size_label?: string | null;
  transform: CustomizationTransform;
  title?: string | null;
  artwork_views?: Record<string, string | null>;
  preview_views?: Record<string, string | null>;
  views_draft?: Record<string, object[]> | null;
};

export type ProductTemplate = {
  id: number;
  slug: string;
  name_fa: string;
  description: string | null;
  base_price: string;
  config_json: {
    mesh?: string;
    colors?: { name: string; hex: string; views?: Record<string, string> }[];
    sizes?: string[];
    fonts?: { name: string; family: string; url?: string }[];
    /** سایدها (جلو، پشت، …) + محدوده چاپ هر کدام — مدیریت از ادمین */
    sides?: {
      id: string;
      label_fa: string;
      sort_order?: number;
      enabled?: boolean;
      print_area: { x: number; y: number; width: number; height: number };
    }[];
    print_area?: { width: number; height: number };
    mockup?: {
      width?: number;
      height?: number;
      views?: Record<string, string>;
      side_print_areas?: Record<string, { x: number; y: number; width: number; height: number }>;
      print_areas?: Record<string, { x: number; y: number; width: number; height: number }>;
      layers?: { base?: string; mask?: string; shadow?: string; highlight?: string };
      designArea?: {
        tl: [number, number];
        tr: [number, number];
        br: [number, number];
        bl: [number, number];
      };
    };
    camera?: { position: number[]; fov: number };
  };
  category_slug: string | null;
  default_variation_id: number | null;
};

const API_URL = apiBase();

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${API_URL}${path}`, { ...init, signal: controller.signal });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

export function fetchCustomizerTemplates() {
  return apiFetch<ProductTemplate[]>("/api/v1/customizer/templates", {
    next: { revalidate: 120 },
  } as RequestInit);
}

export function fetchCustomizerTemplate(slug: string) {
  const init: RequestInit =
    typeof window === "undefined"
      ? ({ next: { revalidate: 120 } } as RequestInit)
      : { cache: "no-store" };
  return apiFetch<ProductTemplate>(`/api/v1/customizer/templates/${encodeURIComponent(slug)}`, init);
}

export function fetchDesignArtLibrary(category?: string) {
  const q = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiFetch<DesignArtLibrary>(`/api/v1/customizer/art${q}`);
}

export async function adminFetchDesignArt(token: string) {
  const res = await fetch(`${API_URL}/api/v1/customizer/admin/art`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<DesignArtClip[]>;
}

export async function adminCreateDesignArt(
  token: string,
  file: File,
  meta: { category_fa: string; title: string; sort_order?: number },
) {
  const form = new FormData();
  form.append("file", file);
  form.append("category_fa", meta.category_fa);
  form.append("title", meta.title);
  form.append("sort_order", String(meta.sort_order ?? 0));
  const res = await fetch(`${API_URL}/api/v1/customizer/admin/art`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<DesignArtClip>;
}

export async function adminUpdateDesignArt(
  token: string,
  clipId: number,
  patch: { category_fa?: string; title?: string; sort_order?: number; is_active?: boolean },
) {
  const res = await fetch(`${API_URL}/api/v1/customizer/admin/art/${clipId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<DesignArtClip>;
}

export async function adminDeleteDesignArt(token: string, clipId: number) {
  const res = await fetch(`${API_URL}/api/v1/customizer/admin/art/${clipId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function uploadArtwork(file: File) {
  const { ensureCartSession } = await import("@/lib/api");
  const sessionId = await ensureCartSession();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/v1/customizer/upload`, {
    method: "POST",
    headers: { "X-Session-Id": sessionId },
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ storage_key: string; url: string; mime_type: string }>;
}

export async function addCustomToCart(
  variationId: number,
  quantity: number,
  customization: CustomizationPayload | null,
  sessionId: string,
) {
  const res = await fetch(`${API_URL}/api/v1/customizer/cart/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-Id": sessionId,
    },
    body: JSON.stringify({ variation_id: variationId, quantity, customization }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type MyProduct = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  design_id: number;
  preview_url: string | null;
  created_at: string | null;
};

export type DesignArtClip = {
  id: number;
  category_fa: string;
  title: string;
  url: string;
  storage_key: string;
  mime_type: string;
  sort_order: number;
  is_active?: boolean;
};

export type DesignArtLibrary = {
  categories: Record<string, DesignArtClip[]>;
};

/** @deprecated use MyProduct */
export type MyDesign = MyProduct;

export async function publishDesign(
  payload: {
    title: string;
    description?: string;
    thematic_category_id?: number;
    product_types?: string[];
    customization: CustomizationPayload;
    customizations_by_type?: Record<string, CustomizationPayload>;
    commission_percent?: number;
    status?: string;
  },
  token: string,
  admin = false,
) {
  const path = admin ? "/api/v1/customizer/admin/publish" : "/api/v1/customizer/publish";
  const controller = new AbortController();
  const timeoutMs = (payload.product_types?.length ?? 1) > 1 ? 120000 : 60000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      let detail = text || res.statusText;
      try {
        const j = JSON.parse(text) as { detail?: string };
        if (typeof j.detail === "string") detail = j.detail;
      } catch {
        /* plain text */
      }
      throw new Error(detail);
    }
    return res.json() as Promise<{
      design_id: number;
      design_slug: string;
      products: { id: number; slug: string; title: string; status: string }[];
      message?: string;
    }>;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("زمان درخواست تمام شد — دوباره تلاش کنید");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchMyProducts(token: string) {
  const res = await fetch(`${API_URL}/api/v1/customizer/my-products`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<MyProduct[]>;
}

export async function fetchMyDesigns(token: string) {
  return fetchMyProducts(token);
}

export async function fetchMyEarnings(token: string) {
  const res = await fetch(`${API_URL}/api/v1/customizer/earnings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ total_earned: string; pending: string; sales_count: number }>;
}

export async function adminUpdateTemplateConfig(
  slug: string,
  config: Record<string, unknown>,
  token: string,
) {
  const res = await fetch(`${API_URL}/api/v1/customizer/admin/templates/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ config_json: config }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<ProductTemplate>;
}

export async function adminUploadTemplateMockup(
  slug: string,
  file: File,
  opts: { view: string; color_hex?: string },
  token: string,
) {
  const form = new FormData();
  form.append("file", file);
  form.append("view", opts.view);
  if (opts.color_hex) form.append("color_hex", opts.color_hex);
  const res = await fetch(
    `${API_URL}/api/v1/customizer/admin/templates/${encodeURIComponent(slug)}/mockup`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form },
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<ProductTemplate>;
}

export async function adminCreateTemplate(
  body: {
    slug: string;
    name_fa: string;
    description?: string;
    base_price: number;
    category_slug?: string;
    config_json?: Record<string, unknown>;
  },
  token: string,
) {
  const res = await fetch(`${API_URL}/api/v1/customizer/admin/templates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<ProductTemplate>;
}

export async function adminUploadTemplateFont(
  slug: string,
  file: File,
  opts: { name: string; family: string },
  token: string,
) {
  const form = new FormData();
  form.append("file", file);
  form.append("name", opts.name);
  form.append("family", opts.family);
  const res = await fetch(
    `${API_URL}/api/v1/customizer/admin/templates/${encodeURIComponent(slug)}/font`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form },
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<ProductTemplate>;
}

export const DEFAULT_TRANSFORM: CustomizationTransform = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
};

/** URL هم‌مبدأ برای نمایش در Three.js/img — بدون مشکل CORS */
export function artworkPreviewUrl(storageKey: string): string {
  return mediaUrl(storageKey);
}

export interface Product {
  id: number;
  slug: string;
  title: string;
  base_price: string;
  status: string;
  design_id: number;
  thumbnail_url?: string | null;
  image_count?: number;
  variation_count?: number;
}

export interface ProductDetail extends Product {
  effective_price: string;
  description?: string | null;
  image_urls: string[];
  variations: { id: number; sku: string; unit_price: string }[];
  store_url: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  errors: string[];
}

export interface PublishResult {
  run_id: string;
  product_id: number;
  product_title: string;
  product_slug: string;
  results: {
    channel_id: string;
    status: string;
    message: string;
    external_url?: string | null;
  }[];
}

export interface HistoryRecord {
  id: number;
  run_id: string;
  product_slug: string;
  channel_id: string;
  status: string;
  message: string;
  external_url?: string | null;
  created_at: string;
}

export interface Health {
  api_ok: boolean;
  api_url: string;
  api_status?: string;
  error?: string;
}

export interface AuthStatus {
  logged_in: boolean;
  phone?: string;
  role?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  health: () => request<Health>("/api/health"),
  authStatus: () => request<AuthStatus>("/api/auth/status"),
  login: (phone: string, password: string) =>
    request<{ phone: string; role: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    }),
  products: (status?: string) =>
    request<Product[]>(`/api/products${status ? `?status=${status}` : ""}`),
  product: (ref: string) => request<ProductDetail>(`/api/products/${ref}`),
  syncProducts: () => request<{ synced: number }>("/api/products/sync", { method: "POST" }),
  channels: () => request<Channel[]>("/api/channels"),
  publish: (products: string[], channels: string[], dryRun: boolean) =>
    request<PublishResult[]>("/api/publish", {
      method: "POST",
      body: JSON.stringify({ products, channels, dry_run: dryRun }),
    }),
  history: () => request<HistoryRecord[]>("/api/history"),
};

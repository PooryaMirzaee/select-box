/**
 * کلاینت API — سرور و مرورگر.
 */

import type { CategoryNavNode } from "@/lib/category-nav";
import type { HeaderNavLink } from "@/lib/header-nav";
import type { HomeBanner } from "@/lib/home-banners";
import type { HomepageConfig } from "@/lib/homepage";
import type { SizeGuideData } from "@/lib/size-guide";
import { apiBase } from "@/lib/api-base";

const API_URL = apiBase();

export type ProductSummary = {
  id: number;
  slug: string;
  title: string;
  base_price: string;
  status: string;
  design_id: number;
  parent_category_slug: string | null;
  image_url: string | null;
};

export type VariationPublic = {
  id: number;
  sku: string;
  color_name: string | null;
  color_hex: string | null;
  size_label: string | null;
  price_delta: string;
  stock_quantity: number;
  unit_price: string;
};

export type BreadcrumbItem = { name_fa: string; slug: string; path: string };

export type ProductDetail = {
  id: number;
  slug: string;
  title: string;
  base_price: string;
  compare_at_price: string | null;
  status: string;
  meta_title: string | null;
  meta_description: string | null;
  description: string | null;
  size_guide?: SizeGuideData | null;
  design_id: number;
  design_slug: string;
  design_title: string;
  default_sku: string | null;
  in_stock: boolean;
  effective_price: string;
  images: string[];
  image_urls: string[];
  variations: VariationPublic[];
  related: { id: number; slug: string; title: string; base_price: string }[];
  breadcrumbs: BreadcrumbItem[];
  creator?: {
    id: number;
    display_name: string;
    studio_slug: string;
    bio?: string | null;
    tagline?: string | null;
    accent_hex?: string;
  } | null;
};

/** @deprecated use fetchStudioProfile from @/lib/studio */
export function fetchCreatorProfile(creatorId: number) {
  return apiFetch<{
    studio: {
      id: number;
      display_name: string;
      studio_slug: string;
      bio: string | null;
      tagline: string | null;
      accent_hex: string;
      product_count: number;
      preview_image_url: string | null;
    };
    creator: { id: number; display_name: string; studio_slug: string };
    products: ProductSummary[];
  }>(`/api/v1/catalog/creators/${creatorId}`, {
    next: { revalidate: 60 },
  } as RequestInit);
}

export type BrowseResponse = {
  breadcrumbs: BreadcrumbItem[];
  current: {
    id: number;
    slug: string;
    name_fa: string;
    meta_title?: string | null;
    meta_description?: string | null;
    image_url?: string | null;
  } | null;
  children: {
    id: number;
    slug: string;
    name_fa: string;
    path: string;
    image_url?: string | null;
    child_count?: number;
  }[];
  products: ProductSummary[];
  error?: string;
};

export type ProductAdmin = {
  id: number;
  design_id: number;
  parent_category_id: number;
  thematic_category_id?: number | null;
  design_title?: string | null;
  design_code?: string | null;
  design_source_type?: string | null;
  slug: string;
  title: string;
  base_price: string;
  compare_at_price: string | null;
  status: string;
  meta_title: string | null;
  meta_description: string | null;
  description: string | null;
  size_guide_json?: SizeGuideData | null;
  thumbnail_url: string | null;
  image_count: number;
  variation_count?: number;
  published_at?: string | null;
};

export type OrderAdminListItem = {
  id: number;
  tracking_code: string;
  status: string;
  total: string;
  subtotal: string;
  item_count: number;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string | null;
};

export type OrderItemAdmin = {
  id: number;
  variation_id: number;
  quantity: number;
  unit_price: string;
  title_snapshot: string;
  sku_snapshot: string;
  is_custom: boolean;
  preview_url: string | null;
  design_id: number | null;
  product_id: number | null;
};

export type PaymentAdmin = {
  id: number;
  gateway: string;
  gateway_ref: string | null;
  amount: string;
  status: string;
  receipt_url: string | null;
  customer_note: string | null;
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string | null;
};

export type OrderAdminDetail = {
  id: number;
  tracking_code: string;
  status: string;
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  total: string;
  shipping_address: Record<string, unknown> | null;
  cart_snapshot: Record<string, unknown>;
  items: OrderItemAdmin[];
  payments: PaymentAdmin[];
  coupon_code: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type VariationAdmin = {
  id: number;
  product_id: number;
  sku: string;
  color_name: string | null;
  color_hex: string | null;
  size_label: string | null;
  price_delta: string;
  stock_quantity: number;
  is_active: boolean;
};

export type CategoryAdmin = {
  id: number;
  parent_id: number | null;
  slug: string;
  name_fa: string;
  meta_title?: string | null;
  meta_description?: string | null;
  sort_order?: number;
  is_active: boolean;
  icon_url?: string | null;
};

export type { CategoryNavNode } from "@/lib/category-nav";
export type DesignAdmin = { id: number; code: string; title: string; slug: string; thematic_category_id: number };

export type CartLine = {
  id: number;
  variation_id: number;
  quantity: number;
  sku: string;
  title: string;
  unit_price: string;
  customization?: Record<string, unknown> | null;
  preview_url?: string | null;
  is_custom?: boolean;
};

export type Cart = { id: number; currency: string; items: CartLine[] };

type ApiFetchInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

function normalizeSlugParam(slug: string): string {
  if (!slug) return slug;
  try {
    if (/%[0-9A-Fa-f]{2}/.test(slug)) {
      return decodeURIComponent(slug);
    }
  } catch {
    /* keep original */
  }
  return slug;
}

export async function apiFetch<T>(path: string, init?: ApiFetchInit, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new Error("اتصال به سرور برقرار نشد — بک‌اند را روی پورت ۸۰۰۰ اجرا کنید");
  }
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
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function fetchProducts(parentSlug?: string) {
  const q = parentSlug ? `?parent_slug=${parentSlug}&limit=48` : "?limit=48";
  return apiFetch<ProductSummary[]>(`/api/v1/catalog/products${q}`, {
    next: { revalidate: 60, tags: ["catalog"] },
  });
}

export function fetchProduct(slug: string) {
  const normalized = normalizeSlugParam(slug);
  return apiFetch<ProductDetail>(`/api/v1/catalog/products/${encodeURIComponent(normalized)}`, {
    next: { revalidate: 60, tags: [`product:${normalized}`] },
  }).catch(() => null);
}

export async function fetchProductSlugs() {
  const res = await apiFetch<{ slugs: string[] }>("/api/v1/catalog/product-slugs", {
    next: { revalidate: 300, tags: ["sitemap", "catalog"] },
  });
  return res.slugs ?? [];
}

export function fetchCategoriesTree() {
  return apiFetch<unknown[]>("/api/v1/catalog/categories/tree", {
    next: { revalidate: 300 },
  });
}

export function fetchCategoryNav() {
  return apiFetch<CategoryNavNode[]>("/api/v1/catalog/categories/nav", {
    next: { revalidate: 120, tags: ["category-nav"] },
  });
}

export function fetchHeaderNav() {
  return apiFetch<HeaderNavLink[]>("/api/v1/catalog/header-nav", {
    next: { revalidate: 120, tags: ["header-nav"] },
  });
}

export function fetchHomeBanners(placement?: "hero" | "promo") {
  const q = placement ? `?placement=${placement}` : "";
  return apiFetch<HomeBanner[]>(`/api/v1/catalog/home-banners${q}`, {
    next: { revalidate: 60, tags: ["home-banners", placement ? `home-banners-${placement}` : "home-banners-all"] },
  });
}

export function fetchHomepageConfig() {
  return apiFetch<HomepageConfig>("/api/v1/catalog/homepage", {
    next: { revalidate: 60, tags: ["homepage"] },
  });
}

export function fetchSitemapPaths() {
  return apiFetch<{ paths: string[] }>("/api/v1/catalog/sitemap-paths", {
    next: { revalidate: 300, tags: ["sitemap"] },
  });
}

export type ShopSettings = {
  shop_name: string;
  shop_description: string;
  default_meta_title: string;
  default_meta_description: string;
  site_url: string;
  shipping_flat_toman: number;
  currency_label: string;
  payment_gateway: string;
  card_transfer_enabled: boolean;
  card_number: string;
  card_holder: string;
  card_bank_name: string;
  card_transfer_instructions: string;
  contact_phone: string;
  contact_email: string;
  contact_whatsapp: string;
  contact_telegram: string;
  contact_instagram: string;
  contact_address: string;
  contact_hours: string;
  google_analytics_id: string;
};

export type SmsTemplateParam = {
  name: string;
  label_fa: string;
};

export type SmsTemplate = {
  id: string;
  label_fa: string;
  template_id: number;
  enabled: boolean;
  parameters: SmsTemplateParam[];
};

export type ShopSettingsAdmin = ShopSettings & {
  zarinpal_merchant_id: string;
  zarinpal_sandbox: boolean;
  zarinpal_callback_url: string;
  sms_enabled: boolean;
  sms_ir_api_key: string;
  sms_ir_api_key_set: boolean;
  sms_ir_api_base: string;
  sms_ir_line_number: string;
  dev_otp_code: string;
  sms_templates: SmsTemplate[];
  avalai_enabled: boolean;
  avalai_api_key: string;
  avalai_api_key_set: boolean;
  avalai_image_model: string;
  avalai_require_login: boolean;
  avalai_max_per_user_hour: number;
  avalai_max_per_user_day: number;
  avalai_max_global_day: number;
  avalai_max_per_ip_hour: number;
  avalai_cooldown_seconds: number;
};

export type SmsTestResult = {
  ok: boolean;
  detail: string;
  sms_sent: boolean;
};

export function fetchShopSettings() {
  return apiFetch<ShopSettings>("/api/v1/catalog/shop", {
    next: { revalidate: 120, tags: ["shop-settings"] },
  });
}

/* --- سفارش سازمانی --- */

export type BusinessFeature = { icon: string; title: string; description: string };
export type BusinessPricingTier = { min_qty: number; unit_price_toman: number; label_fa: string };
export type BusinessUseCase = { title: string; description: string };
export type BusinessProcessStep = { title: string; description: string };
export type BusinessFaq = { question: string; answer: string };
export type BusinessStat = { value: string; label: string };
export type BusinessGalleryItem = {
  id: string;
  caption_fa: string | null;
  sort_order: number;
  storage_key?: string | null;
  external_url?: string | null;
  image_url: string | null;
};
export type BusinessTrustLogo = { name_fa: string; storage_key?: string | null; logo_url: string | null };
export type BusinessTrustBadge = { icon: string; title: string; description: string };
export type BusinessTestimonial = {
  quote: string;
  author_name: string;
  author_role: string | null;
  company: string | null;
  rating: number;
};

export type BusinessLanding = {
  slug: string;
  name_fa: string;
  title: string;
  subtitle: string | null;
  hero_badge: string | null;
  meta_title: string | null;
  meta_description: string | null;
  hero_image_url: string | null;
  min_order_qty: number;
  features: BusinessFeature[];
  pricing_tiers: BusinessPricingTier[];
  use_cases: BusinessUseCase[];
  process_steps: BusinessProcessStep[];
  faqs: BusinessFaq[];
  stats: BusinessStat[];
  gallery_images: BusinessGalleryItem[];
  gallery_title: string | null;
  trust_logos: BusinessTrustLogo[];
  trust_badges: BusinessTrustBadge[];
  testimonials: BusinessTestimonial[];
  trust_section_title: string | null;
  cta_primary: string;
  cta_secondary: string | null;
};

export type BusinessHub = {
  hub: BusinessLanding;
  product_landings: BusinessLanding[];
};

export type BusinessLandingAdmin = BusinessLanding & {
  id: number;
  hero_image_key: string | null;
  is_published: boolean;
  sort_order: number;
};

export type BusinessQuoteAdmin = {
  id: number;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string | null;
  product_type: string;
  quantity: number;
  needs_custom_design: boolean;
  message: string | null;
  status: string;
  admin_notes: string | null;
  landing_slug: string | null;
  created_at: string;
  updated_at: string;
};

export function fetchBusinessHub() {
  return apiFetch<BusinessHub>("/api/v1/catalog/business", {
    next: { revalidate: 60, tags: ["business"] },
  });
}

export function fetchBusinessLanding(slug: string) {
  return apiFetch<BusinessLanding>(`/api/v1/catalog/business/${slug}`, {
    next: { revalidate: 60, tags: ["business", `business-${slug}`] },
  });
}

export async function submitBusinessQuote(payload: {
  company_name: string;
  contact_name: string;
  phone: string;
  email?: string;
  product_type: string;
  quantity: number;
  needs_custom_design?: boolean;
  message?: string;
  landing_slug?: string;
}) {
  return apiFetch<{ id: number; tracking_ref: string; message: string }>(
    "/api/v1/catalog/business/quote",
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function fetchBrowse(path: string, productType?: string) {
  const q = new URLSearchParams();
  if (path) q.set("path", path);
  if (productType) q.set("product_type", productType);
  return apiFetch<BrowseResponse>(`/api/v1/catalog/browse?${q}`, {
    next: { revalidate: 60, tags: ["browse"] },
  });
}

/* --- مرورگر --- */

export async function ensureCartSession(): Promise<string> {
  const { getSessionId, setSessionId } = await import("./cart-session");
  let sid = getSessionId();
  if (sid) return sid;
  const res = await apiFetch<{ session_id: string }>("/api/v1/cart/session", {
    method: "POST",
  });
  setSessionId(res.session_id);
  return res.session_id;
}

function sessionHeaders(sid: string) {
  return { "X-Session-Id": sid };
}

export async function getCartClient(): Promise<Cart> {
  const sid = await ensureCartSession();
  return apiFetch<Cart>("/api/v1/cart", { headers: sessionHeaders(sid) });
}

export async function addToCart(variationId: number, quantity = 1) {
  const sid = await ensureCartSession();
  return apiFetch<Cart>("/api/v1/cart/items", {
    method: "POST",
    body: JSON.stringify({ variation_id: variationId, quantity }),
    headers: sessionHeaders(sid),
  });
}

export async function updateCartItem(itemId: number, quantity: number) {
  const sid = await ensureCartSession();
  return apiFetch<Cart>(`/api/v1/cart/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
    headers: sessionHeaders(sid),
  });
}

export async function removeCartItem(itemId: number) {
  const sid = await ensureCartSession();
  return apiFetch<Cart>(`/api/v1/cart/items/${itemId}`, {
    method: "DELETE",
    headers: sessionHeaders(sid),
  });
}

export async function createOrder(payload: {
  coupon_code?: string;
  shipping_address?: Record<string, string>;
}) {
  const sid = await ensureCartSession();
  const { authHeaders } = await import("@/lib/auth");
  return apiFetch<{
    order_id: number;
    tracking_code: string;
    total: string;
    status: string;
  }>("/api/v1/checkout/orders", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { ...sessionHeaders(sid), ...authHeaders() },
  });
}

export async function initiatePayment(orderId: number) {
  const sid = await ensureCartSession();
  const { authHeaders } = await import("@/lib/auth");
  return apiFetch<{
    payment_id: number;
    payment_url: string;
    gateway: string;
    amount: string;
  }>(`/api/v1/payments/orders/${orderId}/initiate`, {
    method: "POST",
    headers: { ...sessionHeaders(sid), ...authHeaders() },
  });
}

export type CardTransferInit = {
  payment_id: number;
  gateway: "card_transfer";
  amount: string;
  tracking_code: string;
  card_number: string;
  card_holder: string;
  card_bank_name: string;
  instructions: string;
  receipt_uploaded: boolean;
  payment_url: string;
};

export async function initiateCardTransfer(orderId: number) {
  const sid = await ensureCartSession();
  const { authHeaders } = await import("@/lib/auth");
  return apiFetch<CardTransferInit>(`/api/v1/payments/orders/${orderId}/card-transfer`, {
    method: "POST",
    headers: { ...sessionHeaders(sid), ...authHeaders() },
  });
}

export async function uploadPaymentReceipt(paymentId: number, file: File, customerNote?: string) {
  const sid = await ensureCartSession();
  const { authHeaders } = await import("@/lib/auth");
  const form = new FormData();
  form.append("file", file);
  if (customerNote?.trim()) form.append("customer_note", customerNote.trim());

  const headers: Record<string, string> = { ...sessionHeaders(sid), ...authHeaders() };
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/payments/${paymentId}/receipt`, {
      method: "POST",
      body: form,
      headers,
    });
  } catch {
    throw new Error("اتصال به سرور برقرار نشد");
  }
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
  return res.json() as Promise<{ ok: boolean; receipt_url: string; message: string }>;
}

export async function adminApproveCardPayment(paymentId: number, token: string) {
  return adminFetch<PaymentAdmin>(`/api/v1/admin/payments/${paymentId}/approve-card`, token, {
    method: "POST",
  });
}

export async function adminRejectCardPayment(
  paymentId: number,
  token: string,
  adminNote?: string,
) {
  return adminFetch<PaymentAdmin>(`/api/v1/admin/payments/${paymentId}/reject-card`, token, {
    method: "POST",
    body: JSON.stringify({ admin_note: adminNote || null }),
  });
}

export async function confirmPayment(orderId: number) {
  const sid = await ensureCartSession();
  const { authHeaders } = await import("@/lib/auth");
  return apiFetch<{ ok: boolean; tracking_code: string }>(
    `/api/v1/payments/orders/${orderId}/confirm`,
    {
      method: "POST",
      headers: { ...sessionHeaders(sid), ...authHeaders() },
    },
  );
}

export async function validateCoupon(code: string, subtotal: string) {
  return apiFetch<{ discount: string }>("/api/v1/checkout/validate-coupon", {
    method: "POST",
    body: JSON.stringify({ code, subtotal }),
  });
}

export async function adminLogin(phone: string, password: string) {
  return apiFetch<{ access_token: string }>("/api/v1/auth/admin/login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });
}

export async function adminFetch<T>(
  path: string,
  token: string,
  init?: Omit<ApiFetchInit, "headers"> & { headers?: Record<string, string> },
) {
  const { next: _next, ...rest } = init ?? {};
  return apiFetch<T>(path, {
    ...rest,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

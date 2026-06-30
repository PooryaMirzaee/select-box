import { getAuthToken, getSessionId, setAuthToken } from "@/lib/cart-session";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type AuthUser = {
  id: number;
  phone: string;
  full_name: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  is_creator: boolean;
  studio_slug: string | null;
  order_count: number;
  created_at: string | null;
};

export type MyOrderSummary = {
  id: number;
  tracking_code: string;
  status: string;
  total: string;
  subtotal: string;
  item_count: number;
  created_at: string | null;
};

export type MyOrderDetail = MyOrderSummary & {
  discount_total: string;
  shipping_total: string;
  shipping_address: Record<string, unknown> | null;
  snapshot: { lines?: unknown[] } | null;
  items: {
    id: number;
    title: string;
    sku: string;
    quantity: number;
    unit_price: string;
  }[];
};

function parseError(text: string): string {
  try {
    const j = JSON.parse(text) as { detail?: string };
    if (typeof j.detail === "string") return j.detail;
  } catch {
    /* plain */
  }
  return text;
}

export async function requestOtp(phone: string) {
  const res = await fetch(`${API}/api/v1/auth/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) throw new Error(parseError(await res.text()));
  return res.json() as Promise<{ ok: boolean; detail: string; sms_sent?: boolean; phone: string }>;
}

export async function verifyOtp(phone: string, code: string) {
  const res = await fetch(`${API}/api/v1/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code }),
  });
  if (!res.ok) throw new Error(parseError(await res.text()));
  const data = await res.json();
  setAuthToken(data.access_token);
  await mergeCartAfterLogin();
  return data as {
    access_token: string;
    role: string;
    phone: string;
    full_name: string | null;
    user_id: number;
  };
}

export async function mergeCartAfterLogin() {
  const token = getAuthToken();
  const sessionId = getSessionId();
  if (!token || !sessionId) return null;
  const res = await fetch(`${API}/api/v1/auth/session/merge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ merged: number; message: string }>;
}

export async function fetchMe(token?: string | null): Promise<AuthUser | null> {
  const t = token ?? getAuthToken();
  if (!t) return null;
  const res = await fetch(`${API}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  if (res.status === 401) {
    setAuthToken(null);
    return null;
  }
  if (!res.ok) return null;
  return res.json() as Promise<AuthUser>;
}

export async function updateProfile(body: { full_name?: string | null; email?: string | null }) {
  const token = getAuthToken();
  if (!token) throw new Error("وارد نشده‌اید");
  const res = await fetch(`${API}/api/v1/auth/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(parseError(await res.text()));
  return res.json() as Promise<AuthUser>;
}

export async function fetchMyOrders() {
  const token = getAuthToken();
  if (!token) throw new Error("وارد نشده‌اید");
  const res = await fetch(`${API}/api/v1/auth/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(parseError(await res.text()));
  const data = await res.json();
  return data.orders as MyOrderSummary[];
}

export async function fetchMyOrder(orderId: number) {
  const token = getAuthToken();
  if (!token) throw new Error("وارد نشده‌اید");
  const res = await fetch(`${API}/api/v1/auth/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(parseError(await res.text()));
  return res.json() as Promise<MyOrderDetail>;
}

export function logout() {
  setAuthToken(null);
}

export function isLoggedIn() {
  return Boolean(getAuthToken());
}

export function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

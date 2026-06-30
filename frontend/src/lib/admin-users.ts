import { adminFetch } from "@/lib/api";

export type UserAdmin = {
  id: number;
  phone: string;
  full_name: string | null;
  display_name?: string;
  email: string | null;
  role: string;
  is_active: boolean;
  is_creator: boolean;
  studio_slug: string | null;
  created_at: string | null;
  order_count?: number;
  product_count?: number;
  published_count?: number;
  pending_count?: number;
  total_earned?: string;
  sales_count?: number;
};

export type UserAdminDetail = UserAdmin & {
  recent_orders: {
    id: number;
    tracking_code: string;
    status: string;
    total: string;
    created_at: string | null;
  }[];
  products?: { id: number; title: string; slug: string; status: string; design_code: string | null }[];
  studio?: Record<string, unknown>;
};

export type CreatorSubmission = {
  product_id: number;
  title: string;
  slug: string;
  status: string;
  created_at: string | null;
  creator: { id: number; display_name: string; phone: string; studio_slug: string } | null;
};

export function fetchAdminUsers(
  token: string,
  params?: { q?: string; role?: string; is_active?: boolean; creators_only?: boolean },
) {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.role) sp.set("role", params.role);
  if (params?.is_active !== undefined) sp.set("is_active", String(params.is_active));
  if (params?.creators_only) sp.set("creators_only", "true");
  const q = sp.toString();
  return adminFetch<{ items: UserAdmin[]; total: number }>(
    `/api/v1/admin/users${q ? `?${q}` : ""}`,
    token,
  );
}

export function fetchAdminUser(token: string, id: number) {
  return adminFetch<UserAdminDetail>(`/api/v1/admin/users/${id}`, token);
}

export function patchAdminUser(
  token: string,
  id: number,
  body: {
    full_name?: string | null;
    email?: string | null;
    role?: string;
    is_active?: boolean;
    password?: string;
  },
) {
  return adminFetch<UserAdminDetail>(`/api/v1/admin/users/${id}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function createStaffUser(
  token: string,
  body: { phone: string; password: string; role: "admin" | "operator"; full_name?: string },
) {
  return adminFetch<UserAdmin>("/api/v1/admin/users/staff", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function fetchAdminCreators(token: string, q?: string) {
  const suffix = q ? `?q=${encodeURIComponent(q)}` : "";
  return adminFetch<{ items: UserAdmin[]; total: number }>(`/api/v1/admin/creators${suffix}`, token);
}

export function fetchCreatorSubmissions(token: string, status = "draft") {
  return adminFetch<{ items: CreatorSubmission[] }>(
    `/api/v1/admin/creators/submissions?status=${encodeURIComponent(status)}`,
    token,
  );
}

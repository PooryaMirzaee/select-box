/**
 * کلاینت API مدیریت AI — ادمین
 */

import { adminFetch } from "@/lib/api";

export type AiSuggestedPromptAdmin = {
  id: number;
  text: string;
  label: string | null;
  sort_order: number;
  enabled: boolean;
  created_at: string;
};

export type AiToolAdmin = {
  id: number;
  name: string;
  description: string | null;
  prompt: string;
  sort_order: number;
  enabled: boolean;
  created_at: string;
};

export type AiAdminConfig = {
  system_prompt_suffix: string;
};

export type AiLog = {
  id: number;
  user_id: number | null;
  user_phone: string | null;
  ip_address: string;
  prompt_text: string;
  model: string;
  status: string;
  error_message: string | null;
  storage_key: string | null;
  aspect_ratio: string;
  generation_type: string;
  tool_id: number | null;
  tool_name: string | null;
  created_at: string;
};

export type AiLogsPage = {
  items: AiLog[];
  total: number;
  page: number;
  page_size: number;
};

export type AiStats = {
  total: number;
  success: number;
  failed: number;
  today: number;
  today_success: number;
  unique_users_today: number;
  top_prompts: { prompt: string; count: number }[];
};

export function fetchAiAdminConfig(token: string) {
  return adminFetch<AiAdminConfig>("/api/v1/admin/ai/config", token);
}

export function patchAiAdminConfig(token: string, body: Partial<AiAdminConfig>) {
  return adminFetch<AiAdminConfig>("/api/v1/admin/ai/config", token, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function fetchAiTools(token: string) {
  return adminFetch<AiToolAdmin[]>("/api/v1/admin/ai/tools", token);
}

export function createAiTool(
  token: string,
  body: { name: string; description?: string | null; prompt: string; sort_order?: number; enabled?: boolean },
) {
  return adminFetch<AiToolAdmin>("/api/v1/admin/ai/tools", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateAiTool(
  token: string,
  id: number,
  body: { name: string; description?: string | null; prompt: string; sort_order?: number; enabled?: boolean },
) {
  return adminFetch<AiToolAdmin>(`/api/v1/admin/ai/tools/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteAiTool(token: string, id: number) {
  return adminFetch<{ ok: boolean }>(`/api/v1/admin/ai/tools/${id}`, token, {
    method: "DELETE",
  });
}

export function fetchAiSuggestedPrompts(token: string) {
  return adminFetch<AiSuggestedPromptAdmin[]>("/api/v1/admin/ai/prompts", token);
}

export function createAiSuggestedPrompt(
  token: string,
  body: { text: string; label?: string | null; sort_order?: number; enabled?: boolean },
) {
  return adminFetch<AiSuggestedPromptAdmin>("/api/v1/admin/ai/prompts", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateAiSuggestedPrompt(
  token: string,
  id: number,
  body: { text: string; label?: string | null; sort_order?: number; enabled?: boolean },
) {
  return adminFetch<AiSuggestedPromptAdmin>(`/api/v1/admin/ai/prompts/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteAiSuggestedPrompt(token: string, id: number) {
  return adminFetch<{ ok: boolean }>(`/api/v1/admin/ai/prompts/${id}`, token, {
    method: "DELETE",
  });
}

export function fetchAiLogs(
  token: string,
  params: { page?: number; page_size?: number; status?: string; search?: string } = {},
) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.page_size) qs.set("page_size", String(params.page_size));
  if (params.status) qs.set("status", params.status);
  if (params.search) qs.set("search", params.search);
  const query = qs.toString();
  return adminFetch<AiLogsPage>(`/api/v1/admin/ai/logs${query ? `?${query}` : ""}`, token);
}

export function fetchAiStats(token: string, days = 30) {
  return adminFetch<AiStats>(`/api/v1/admin/ai/stats?days=${days}`, token);
}

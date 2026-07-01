/**
 * کلاینت طراحی هوشمند CORALAY
 */

import { getAuthToken } from "@/lib/cart-session";
import { apiBase } from "@/lib/api-base";

const API_URL = apiBase();

export type AiQuota = {
  require_login: boolean;
  logged_in: boolean;
  max_per_user_hour: number;
  max_per_user_day: number;
  cooldown_seconds: number;
  used_hour: number;
  used_day: number;
  remaining_hour: number;
  remaining_day: number;
  can_generate: boolean;
  block_reason: string | null;
};

export type AiSuggestedPrompt = {
  id: number;
  text: string;
  label: string | null;
};

export type AiTool = {
  id: number;
  name: string;
  description: string | null;
};

export type AiConfig = {
  suggested_prompts: AiSuggestedPrompt[];
  tools: AiTool[];
};

export type AiHistoryItem = {
  prompt: string;
  created_at: string;
  status: string;
  storage_key: string | null;
  generation_type: string;
  tool_name: string | null;
};

export type AiStatus = {
  enabled: boolean;
  quota: AiQuota | null;
  config: AiConfig | null;
  history: AiHistoryItem[];
};

export type AiGenerateImageResult = {
  image_url: string;
  storage_key: string;
  remaining_hour: number;
  remaining_day: number;
};

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchAiStatus(): Promise<AiStatus> {
  const res = await fetch(`${API_URL}/api/v1/ai/status`, {
    cache: "no-store",
    headers: authHeaders(),
  });
  if (!res.ok) return { enabled: false, quota: null, config: null, history: [] };
  return res.json() as Promise<AiStatus>;
}

export async function generateAiImage(
  prompt: string,
  aspectRatio = "1:1",
): Promise<AiGenerateImageResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch(`${API_URL}/api/v1/ai/generate-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ prompt, aspect_ratio: aspectRatio }),
      signal: controller.signal,
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const err = (await res.json()) as { detail?: string };
        detail = err.detail ?? detail;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
    return res.json() as Promise<AiGenerateImageResult>;
  } finally {
    clearTimeout(timeout);
  }
}

export async function transformAiImage(toolId: number, file: File): Promise<AiGenerateImageResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  const form = new FormData();
  form.append("tool_id", String(toolId));
  form.append("image", file);
  try {
    const res = await fetch(`${API_URL}/api/v1/ai/transform-image`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const err = (await res.json()) as { detail?: string };
        detail = err.detail ?? detail;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
    return res.json() as Promise<AiGenerateImageResult>;
  } finally {
    clearTimeout(timeout);
  }
}

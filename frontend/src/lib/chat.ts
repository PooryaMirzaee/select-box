/** کلاینت چت پشتیبانی — REST + WebSocket */

import { adminFetch, apiFetch } from "@/lib/api";
import { apiBase } from "@/lib/api-base";
import { getAuthToken } from "@/lib/cart-session";
import { STORAGE_KEYS } from "@/lib/storage-keys";

const API_URL = apiBase();

export type ChatMessage = {
  id: number;
  conversation_id: number;
  sender_type: "visitor" | "admin" | "system";
  sender_user_id: number | null;
  sender_name: string | null;
  message_type: "text" | "system" | "internal" | "image" | "file";
  body: string;
  attachment_key: string | null;
  attachment_name: string | null;
  attachment_url: string | null;
  read_at: string | null;
  created_at: string;
};

export type ChatPageVisit = {
  id: number;
  conversation_id: number;
  page_url: string;
  page_title: string | null;
  visited_at: string;
};

export type ChatConversation = {
  id: number;
  visitor_id: string;
  customer_user_id: number | null;
  assigned_admin_id: number | null;
  status: "open" | "closed" | "pending";
  priority: "low" | "normal" | "high" | "urgent";
  tags: string[];
  visitor_name: string | null;
  visitor_phone: string | null;
  visitor_email: string | null;
  current_page_url: string | null;
  current_page_title: string | null;
  visitor_online: boolean;
  visitor_last_seen_at: string | null;
  referrer_url: string | null;
  browser: string | null;
  os_name: string | null;
  device_type: string | null;
  admin_notes: string | null;
  page_visit_count: number;
  admin_unread_count: number;
  visitor_unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
  customer_name: string | null;
  assigned_admin_name: string | null;
};

export type ChatCannedResponse = {
  id: number;
  title: string;
  body: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type OnlineVisitor = {
  visitor_id: string;
  page_url: string | null;
  page_title: string | null;
  current_page_url: string | null;
  current_page_title: string | null;
  user_id: number | null;
  conversation_id: number | null;
  visitor_name: string | null;
  visitor_phone: string | null;
  has_chatted: boolean;
  admin_unread_count: number;
  connected_at: string | null;
  last_seen: string | null;
  online_seconds: number;
};

export type ChatStats = {
  open_count: number;
  unread_total: number;
  online_visitors: number;
};

export function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map<number, ChatMessage>();
  for (const m of existing) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m);
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export function appendMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) return existing;
  const ids = new Set(existing.map((m) => m.id));
  const added = incoming.filter((m) => !ids.has(m.id));
  return added.length === 0 ? existing : [...existing, ...added];
}

export function getChatWsUrl(): string {
  const base = API_URL.replace(/^http/, "ws");
  return `${base}/api/v1/ws/chat`;
}

export function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEYS.chatVisitorId);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEYS.chatVisitorId, id);
  }
  return id;
}

export function getStoredConversationId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.chatConversationId);
  return raw ? Number(raw) : null;
}

export function setStoredConversationId(id: number | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(STORAGE_KEYS.chatConversationId, String(id));
  else localStorage.removeItem(STORAGE_KEYS.chatConversationId);
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function startChat(payload: {
  visitor_id: string;
  visitor_name?: string;
  visitor_phone?: string;
  visitor_email?: string;
  page_url?: string;
  page_title?: string;
  referrer_url?: string;
  user_agent?: string;
  initial_message?: string;
}) {
  return apiFetch<ChatConversation>("/api/v1/chat/start", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: authHeaders(),
  });
}

export async function fetchChatConversation(convId: number, visitorId: string) {
  return apiFetch<ChatConversation>(
    `/api/v1/chat/conversations/${convId}?visitor_id=${encodeURIComponent(visitorId)}`,
    { headers: authHeaders() },
  );
}

export async function fetchChatMessages(convId: number, visitorId: string, beforeId?: number) {
  const params = new URLSearchParams({ visitor_id: visitorId });
  if (beforeId) params.set("before_id", String(beforeId));
  return apiFetch<{ items: ChatMessage[]; has_more: boolean }>(
    `/api/v1/chat/conversations/${convId}/messages?${params}`,
    { headers: authHeaders() },
  );
}

export async function sendChatMessage(
  convId: number,
  visitorId: string,
  payload: {
    body?: string;
    attachment_key?: string;
    attachment_name?: string;
    message_type?: string;
  },
) {
  return apiFetch<ChatMessage>(
    `/api/v1/chat/conversations/${convId}/messages?visitor_id=${encodeURIComponent(visitorId)}`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      headers: authHeaders(),
    },
  );
}

export const MAX_CHAT_FILE_BYTES = 5 * 1024 * 1024;

const ALLOWED_CHAT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

export function validateChatFileClient(file: File): string | null {
  if (file.size > MAX_CHAT_FILE_BYTES) {
    return "حداکثر حجم فایل ۵ مگابایت است";
  }
  const mime = file.type || "";
  if (mime && !ALLOWED_CHAT_TYPES.has(mime)) {
    return "فقط تصویر (JPG, PNG, GIF, WebP) یا PDF مجاز است";
  }
  const lower = file.name.toLowerCase();
  const blocked = [".php", ".html", ".htm", ".svg", ".js", ".exe", ".sh", ".bat"];
  if (blocked.some((ext) => lower.endsWith(ext) || lower.includes(ext + "."))) {
    return "نوع فایل مجاز نیست";
  }
  return null;
}

export async function uploadChatFile(convId: number, visitorId: string, file: File) {
  const err = validateChatFileClient(file);
  if (err) throw new Error(err);
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(
    `${API_URL}/api/v1/chat/conversations/${convId}/upload?visitor_id=${encodeURIComponent(visitorId)}`,
    { method: "POST", body: form, headers: authHeaders() },
  );
  if (!res.ok) throw new Error("آپلود ناموفق");
  return res.json() as Promise<{
    attachment_key: string;
    attachment_name: string;
    message_type: string;
  }>;
}

export async function recordPageVisit(
  convId: number,
  visitorId: string,
  pageUrl: string,
  pageTitle: string,
) {
  return apiFetch<ChatPageVisit>(
    `/api/v1/chat/conversations/${convId}/page-visit?visitor_id=${encodeURIComponent(visitorId)}`,
    {
      method: "POST",
      body: JSON.stringify({ page_url: pageUrl, page_title: pageTitle }),
      headers: authHeaders(),
    },
  );
}

export async function updateChatPresence(
  convId: number,
  visitorId: string,
  payload: { page_url?: string; page_title?: string; online?: boolean },
) {
  return apiFetch<ChatConversation>(
    `/api/v1/chat/conversations/${convId}/presence?visitor_id=${encodeURIComponent(visitorId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: authHeaders(),
    },
  );
}

export async function markChatReadVisitor(convId: number, visitorId: string) {
  return apiFetch<{ ok: boolean }>(
    `/api/v1/chat/conversations/${convId}/read?visitor_id=${encodeURIComponent(visitorId)}`,
    { method: "POST", headers: authHeaders() },
  );
}

export async function adminFetchOnlineVisitors(token: string) {
  return adminFetch<{ items: OnlineVisitor[]; total: number }>(
    "/api/v1/admin/chat/online-visitors",
    token,
  );
}

export async function adminSendProactiveMessage(token: string, visitorId: string, body: string) {
  return adminFetch<ChatMessage>("/api/v1/admin/chat/proactive", token, {
    method: "POST",
    body: JSON.stringify({ visitor_id: visitorId, body }),
  });
}

export async function adminFetchChatStats(token: string) {
  return adminFetch<ChatStats>("/api/v1/admin/chat/stats", token);
}

export async function adminFetchChatConversation(token: string, convId: number) {
  return adminFetch<ChatConversation>(`/api/v1/admin/chat/conversations/${convId}`, token);
}

export async function adminFetchConversations(
  token: string,
  params?: { status?: string; priority?: string; q?: string; limit?: number; offset?: number },
) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.priority) qs.set("priority", params.priority);
  if (params?.q) qs.set("q", params.q);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return adminFetch<{ items: ChatConversation[]; total: number; unread_total: number }>(
    `/api/v1/admin/chat/conversations${query ? `?${query}` : ""}`,
    token,
  );
}

export async function adminFetchPageVisits(token: string, convId: number) {
  return adminFetch<{ items: ChatPageVisit[]; total: number }>(
    `/api/v1/admin/chat/conversations/${convId}/page-visits`,
    token,
  );
}

export async function adminFetchChatMessages(
  token: string,
  convId: number,
  opts?: { beforeId?: number; q?: string },
) {
  const params = new URLSearchParams();
  if (opts?.beforeId) params.set("before_id", String(opts.beforeId));
  if (opts?.q) params.set("q", opts.q);
  const q = params.toString();
  return adminFetch<{ items: ChatMessage[]; has_more: boolean }>(
    `/api/v1/admin/chat/conversations/${convId}/messages${q ? `?${q}` : ""}`,
    token,
  );
}

export async function adminSendChatMessage(
  token: string,
  convId: number,
  payload: {
    body?: string;
    attachment_key?: string;
    attachment_name?: string;
    message_type?: string;
  },
  internal = false,
) {
  return adminFetch<ChatMessage>(
    `/api/v1/admin/chat/conversations/${convId}/messages?internal=${internal}`,
    token,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function adminUploadChatFile(token: string, convId: number, file: File) {
  const err = validateChatFileClient(file);
  if (err) throw new Error(err);
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/v1/admin/chat/conversations/${convId}/upload`, {
    method: "POST",
    body: form,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("آپلود ناموفق");
  return res.json() as Promise<{
    attachment_key: string;
    attachment_name: string;
    message_type: string;
  }>;
}

export async function adminPatchConversation(
  token: string,
  convId: number,
  payload: {
    status?: string;
    assigned_admin_id?: number | null;
    priority?: string;
    tags?: string[];
    admin_notes?: string;
    visitor_name?: string;
    visitor_phone?: string;
    visitor_email?: string;
  },
) {
  return adminFetch<ChatConversation>(`/api/v1/admin/chat/conversations/${convId}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function adminMarkChatRead(token: string, convId: number) {
  return adminFetch<{ ok: boolean }>(`/api/v1/admin/chat/conversations/${convId}/read`, token, {
    method: "POST",
  });
}

export async function adminExportChat(token: string, convId: number) {
  return adminFetch<{ conversation_id: number; transcript: string; page_visits: ChatPageVisit[] }>(
    `/api/v1/admin/chat/conversations/${convId}/export`,
    token,
  );
}

export async function adminFetchCanned(token: string) {
  return adminFetch<ChatCannedResponse[]>("/api/v1/admin/chat/canned", token);
}

export async function adminCreateCanned(
  token: string,
  payload: { title: string; body: string; sort_order?: number },
) {
  return adminFetch<ChatCannedResponse>("/api/v1/admin/chat/canned", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type WsEvent =
  | { type: "auth_ok"; role: string; user_id?: number; online_visitors?: number }
  | { type: "message"; message: ChatMessage; conversation?: ChatConversation }
  | { type: "typing"; conversation_id: number; role: string; user_id?: number; is_typing: boolean }
  | { type: "presence"; conversation_id: number; visitor_id?: string; page_url?: string; page_title?: string; online: boolean }
  | { type: "page_visit"; conversation_id: number; visit: ChatPageVisit; conversation?: ChatConversation }
  | { type: "visitor_online"; visitor: OnlineVisitor }
  | { type: "visitor_offline"; visitor_id: string }
  | { type: "proactive_message"; message: ChatMessage; conversation: ChatConversation }
  | { type: "conversation_updated"; conversation: ChatConversation }
  | { type: "joined"; conversation_id: number }
  | { type: "error"; detail: string };

export class ChatWebSocket {
  private ws: WebSocket | null = null;
  private listeners = new Set<(ev: WsEvent) => void>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private role: "visitor" | "staff" = "visitor";

  connect(role: "visitor" | "staff" = "visitor") {
    this.role = role;
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.ws = new WebSocket(getChatWsUrl());
    this.ws.onopen = () => {
      const token =
        role === "staff"
          ? localStorage.getItem(STORAGE_KEYS.adminToken)
          : localStorage.getItem(STORAGE_KEYS.authToken);
      const visitorId = localStorage.getItem(STORAGE_KEYS.chatVisitorId);
      this.send({ type: "auth", token, visitor_id: visitorId });
    };
    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as WsEvent;
        this.listeners.forEach((fn) => fn(data));
      } catch {
        /* ignore */
      }
    };
    this.ws.onclose = () => {
      this.reconnectTimer = setTimeout(() => this.connect(this.role), 3000);
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  subscribe(fn: (ev: WsEvent) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  send(payload: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  join(conversationId: number, visitorId?: string) {
    this.send({ type: "join", conversation_id: conversationId, visitor_id: visitorId });
  }

  typing(conversationId: number, isTyping: boolean) {
    this.send({ type: "typing", conversation_id: conversationId, is_typing: isTyping });
  }

  presence(conversationId: number, pageUrl: string, pageTitle: string, visitorId: string) {
    this.send({
      type: "presence",
      conversation_id: conversationId,
      visitor_id: visitorId,
      page_url: pageUrl,
      page_title: pageTitle,
      online: true,
    });
  }

  markRead(conversationId: number) {
    this.send({ type: "read", conversation_id: conversationId });
  }

  browsePresence(pageUrl: string, pageTitle: string, conversationId?: number) {
    this.send({
      type: "browse_presence",
      page_url: pageUrl,
      page_title: pageTitle,
      conversation_id: conversationId,
      visitor_id: localStorage.getItem(STORAGE_KEYS.chatVisitorId),
    });
  }
}

export const chatSocket = typeof window !== "undefined" ? new ChatWebSocket() : null;

/** اعلان مرورگر برای ادمین */
export function notifyAdmin(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((p) => {
      if (p === "granted") new Notification(title, { body, icon: "/favicon.ico" });
    });
  }
}

export const PRIORITY_LABELS: Record<string, string> = {
  low: "کم",
  normal: "عادی",
  high: "بالا",
  urgent: "فوری",
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: "text-muted",
  normal: "",
  high: "text-orange-600",
  urgent: "text-red-600",
};

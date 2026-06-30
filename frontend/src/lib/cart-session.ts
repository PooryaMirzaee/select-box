import { STORAGE_KEYS } from "@/lib/storage-keys";

export function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.sessionId);
}

export function setSessionId(id: string) {
  localStorage.setItem(STORAGE_KEYS.sessionId, id);
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.authToken);
}

export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem(STORAGE_KEYS.authToken, token);
  else localStorage.removeItem(STORAGE_KEYS.authToken);
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.adminToken);
}

export function setAdminToken(token: string | null) {
  if (token) localStorage.setItem(STORAGE_KEYS.adminToken, token);
  else localStorage.removeItem(STORAGE_KEYS.adminToken);
}

"use client";

import { useCallback, useEffect, useState } from "react";

import { ExternalLink, Loader2, Send } from "@/components/icons";
import {
  type OnlineVisitor,
  adminFetchOnlineVisitors,
  adminSendProactiveMessage,
  type WsEvent,
  chatSocket,
} from "@/lib/chat";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} ثانیه`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} دقیقه`;
  return `${Math.floor(seconds / 3600)} ساعت`;
}

type Props = {
  token: string;
  onOpenConversation: (convId: number) => void;
  onMessageSent: (convId: number) => void;
};

export function OnlineVisitorsPanel({ token, onOpenConversation, onMessageSent }: Props) {
  const [visitors, setVisitors] = useState<OnlineVisitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await adminFetchOnlineVisitors(token);
      setVisitors(res.items);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    const unsub = chatSocket?.subscribe((ev: WsEvent) => {
      if (ev.type === "visitor_online" && ev.visitor) {
        setVisitors((prev) => {
          const idx = prev.findIndex((v) => v.visitor_id === ev.visitor.visitor_id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...ev.visitor };
            return next;
          }
          return [ev.visitor, ...prev];
        });
      }
      if (ev.type === "visitor_offline") {
        setVisitors((prev) => prev.filter((v) => v.visitor_id !== ev.visitor_id));
      }
      if (ev.type === "presence" && ev.visitor_id) {
        setVisitors((prev) =>
          prev.map((v) =>
            v.visitor_id === ev.visitor_id
              ? {
                  ...v,
                  current_page_url: ev.page_url ?? v.current_page_url,
                  current_page_title: ev.page_title ?? v.current_page_title,
                  page_url: ev.page_url ?? v.page_url,
                  page_title: ev.page_title ?? v.page_title,
                }
              : v,
          ),
        );
      }
    });
    return () => {
      clearInterval(interval);
      unsub?.();
    };
  }, [refresh]);

  async function handleProactive(visitor: OnlineVisitor) {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      const msg = await adminSendProactiveMessage(token, visitor.visitor_id, draft.trim());
      setDraft("");
      setComposing(null);
      if (visitor.conversation_id) {
        onOpenConversation(visitor.conversation_id);
      } else {
        onOpenConversation(msg.conversation_id);
      }
      onMessageSent(msg.conversation_id);
      await refresh();
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-theme px-4 py-3">
        <h2 className="font-semibold">بازدیدکنندگان آنلاین</h2>
        <p className="text-xs text-muted">
          {visitors.length} نفر در حال مرور سایت — می‌توانید بدون انتظار، به آن‌ها پیام دهید
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {visitors.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">الان کسی آنلاین نیست</p>
        ) : (
          visitors.map((v) => (
            <div key={v.visitor_id} className="border-b border-theme px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
                    <p className="truncate text-sm font-medium">
                      {v.visitor_name || v.visitor_phone || `بازدید #${v.visitor_id.slice(0, 8)}`}
                    </p>
                    {v.has_chatted ? (
                      <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] text-[var(--accent)]">
                        چت دارد
                      </span>
                    ) : (
                      <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-700 dark:text-green-400">
                        فقط مرور
                      </span>
                    )}
                  </div>
                  {(v.current_page_title || v.current_page_url) && (
                    <a
                      href={v.current_page_url ?? v.page_url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 flex items-center gap-1 truncate text-xs text-[var(--accent)] hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      {v.current_page_title || v.current_page_url}
                    </a>
                  )}
                  <p className="mt-0.5 text-[10px] text-muted">
                    {formatDuration(v.online_seconds)} در سایت
                    {v.user_id ? " · کاربر ثبت‌نام‌شده" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  {v.conversation_id && (
                    <button
                      type="button"
                      onClick={() => onOpenConversation(v.conversation_id!)}
                      className="rounded-lg border border-theme px-2 py-1 text-[10px] hover:bg-[var(--sidebar-hover)]"
                    >
                      گفتگو
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setComposing(composing === v.visitor_id ? null : v.visitor_id);
                      setDraft("");
                    }}
                    className="rounded-lg bg-[var(--accent)] px-2 py-1 text-[10px] text-[var(--accent-fg)]"
                  >
                    پیام دادن
                  </button>
                </div>
              </div>

              {composing === v.visitor_id && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleProactive(v)}
                    placeholder="سلام! چطور می‌تونم کمکتون کنم؟"
                    className="flex-1 rounded-lg border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm"
                    autoFocus
                  />
                  <button
                    type="button"
                    disabled={!draft.trim() || sending}
                    onClick={() => handleProactive(v)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-fg)]",
                      "disabled:opacity-50",
                    )}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

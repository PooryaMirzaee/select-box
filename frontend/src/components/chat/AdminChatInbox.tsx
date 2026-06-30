"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AdminChatSidebar } from "@/components/chat/AdminChatSidebar";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { OnlineVisitorsPanel } from "@/components/chat/OnlineVisitorsPanel";
import { Check, Loader2, Send, Upload } from "@/components/icons";
import {
  type ChatConversation,
  type ChatMessage,
  type ChatPageVisit,
  type ChatStats,
  adminExportChat,
  adminFetchChatConversation,
  adminFetchChatMessages,
  adminFetchChatStats,
  adminFetchConversations,
  adminMarkChatRead,
  adminPatchConversation,
  adminSendChatMessage,
  adminUploadChatFile,
  validateChatFileClient,
  appendMessages,
  chatSocket,
  notifyAdmin,
  PRIORITY_COLORS,
  type WsEvent,
} from "@/lib/chat";
import { getAdminToken } from "@/lib/cart-session";
import { cn } from "@/lib/utils";

function formatRelative(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "همین الان";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} دقیقه پیش`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ساعت پیش`;
  return new Date(iso).toLocaleDateString("fa-IR");
}

export function AdminChatInbox() {
  const token = getAdminToken() ?? "";
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [liveVisits, setLiveVisits] = useState<ChatPageVisit[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<"open" | "closed" | "all">("open");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [msgSearch, setMsgSearch] = useState("");
  const [visitorTyping, setVisitorTyping] = useState(false);
  const [view, setView] = useState<"inbox" | "online">("inbox");
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const refreshList = useCallback(async () => {
    if (!token) return;
    const status = filter === "all" ? undefined : filter;
    const res = await adminFetchConversations(token, {
      status,
      priority: priorityFilter || undefined,
      q: search || undefined,
    });
    setConversations(res.items);
    setStats((s) => ({
      ...(s ?? { open_count: 0, online_visitors: 0 }),
      unread_total: res.unread_total,
    }));
  }, [token, filter, priorityFilter, search]);

  const refreshStats = useCallback(async () => {
    if (!token) return;
    setStats(await adminFetchChatStats(token));
  }, [token]);

  const loadMessages = useCallback(
    async (convId: number, q?: string) => {
      if (!token) return;
      setLoadingMsgs(true);
      try {
        const res = await adminFetchChatMessages(token, convId, { q: q || undefined });
        setMessages(res.items);
        if (!q) {
          await adminMarkChatRead(token, convId);
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, admin_unread_count: 0 } : c)),
          );
        }
      } finally {
        setLoadingMsgs(false);
      }
    },
    [token],
  );

  useEffect(() => {
    setLoadingList(true);
    refreshList().finally(() => setLoadingList(false));
  }, [filter, priorityFilter, refreshList]);

  useEffect(() => {
    refreshStats();
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    chatSocket?.connect("staff");
    const unsub = chatSocket?.subscribe((ev: WsEvent) => {
      if (ev.type === "conversation_updated") {
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === ev.conversation.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = ev.conversation;
            return next.sort(
              (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
            );
          }
          return [ev.conversation, ...prev];
        });
        refreshStats();
        refreshList();
      }
      if (ev.type === "message" && ev.message) {
        if (ev.message.sender_type === "visitor") {
          notifyAdmin("پیام جدید", ev.message.body.slice(0, 80));
        }
        if (ev.message.conversation_id === selectedId) {
          setMessages((prev) => appendMessages(prev, [ev.message]));
        }
      }
      if (ev.type === "page_visit" && ev.conversation_id === selectedId) {
        setLiveVisits((prev) => appendVisits(prev, [ev.visit]));
        if (ev.conversation) {
          setConversations((prev) =>
            prev.map((c) => (c.id === ev.conversation_id ? ev.conversation! : c)),
          );
        }
      }
      if (ev.type === "presence") {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === ev.conversation_id
              ? {
                  ...c,
                  current_page_url: ev.page_url ?? c.current_page_url,
                  current_page_title: ev.page_title ?? c.current_page_title,
                  visitor_online: ev.online,
                }
              : c,
          ),
        );
      }
      if (ev.type === "typing" && ev.role === "visitor" && ev.conversation_id === selectedId) {
        setVisitorTyping(ev.is_typing);
        if (ev.is_typing) {
          if (typingTimer.current) clearTimeout(typingTimer.current);
          typingTimer.current = setTimeout(() => setVisitorTyping(false), 3000);
        }
      }
    });
    return () => {
      unsub?.();
    };
  }, [refreshStats, selectedId]);

  useEffect(() => {
    if (selectedId && !selected && token) {
      adminFetchChatConversation(token, selectedId).then((conv) => {
        setConversations((prev) =>
          prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev],
        );
      });
    }
  }, [selectedId, selected, token]);

  useEffect(() => {
    if (selectedId) {
      setLiveVisits([]);
      chatSocket?.join(selectedId);
      loadMessages(selectedId);
    }
  }, [selectedId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, visitorTyping]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || sending) return;
    if (!draft.trim() && !internalNote) return;
    setSending(true);
    try {
      const msg = await adminSendChatMessage(
        token,
        selectedId,
        { body: draft.trim() },
        internalNote,
      );
      setMessages((prev) => appendMessages(prev, [msg]));
      setDraft("");
      if (!internalNote) chatSocket?.typing(selectedId, false);
    } finally {
      setSending(false);
    }
  }

  async function handleFile(file: File) {
    if (!selectedId || sending) return;
    const err = validateChatFileClient(file);
    if (err) {
      alert(err);
      return;
    }
    setSending(true);
    try {
      const uploaded = await adminUploadChatFile(token, selectedId, file);
      const msg = await adminSendChatMessage(token, selectedId, {
        body: "",
        attachment_key: uploaded.attachment_key,
        attachment_name: uploaded.attachment_name,
        message_type: uploaded.message_type,
      });
      setMessages((prev) => appendMessages(prev, [msg]));
    } finally {
      setSending(false);
    }
  }

  async function handleExport() {
    if (!selectedId) return;
    const data = await adminExportChat(token, selectedId);
    const blob = new Blob([data.transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${selectedId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openConversation(convId: number) {
    setView("inbox");
    setSelectedId(convId);
    refreshList();
  }

  function updateConversation(conv: ChatConversation) {
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? conv : c)));
  }

  const chatPanelInner = selected ? (
    <>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-theme px-4 py-3">
          <div>
            <p className="font-semibold">
              {selected.visitor_name || selected.customer_name || "بازدیدکننده"}
            </p>
            <p className="text-xs text-muted">
              {selected.visitor_online ? (
                <span className="text-green-600">آنلاین</span>
              ) : (
                <>آخرین بازدید: {formatRelative(selected.visitor_last_seen_at)}</>
              )}
              {visitorTyping && " · در حال نوشتن…"}
              {" · "}{selected.page_visit_count} صفحه بازدید شده
            </p>
          </div>
          <div className="flex gap-2">
            {selected.status !== "closed" && (
              <button
                type="button"
                onClick={async () => {
                  await adminPatchConversation(token, selected.id, { status: "closed" });
                  await refreshList();
                }}
                className="flex items-center gap-1 rounded-lg border border-theme px-3 py-1.5 text-xs hover:bg-[var(--accent-soft)]"
              >
                <Check className="h-3.5 w-3.5" />
                بستن
              </button>
            )}
          </div>
        </header>

        <div className="border-b border-theme px-4 py-2">
          <input
            type="search"
            placeholder="جستجو در پیام‌ها…"
            value={msgSearch}
            onChange={(e) => setMsgSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadMessages(selected.id, msgSearch)}
            className="w-full rounded-lg border border-theme bg-[var(--input-bg)] px-3 py-1.5 text-xs"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loadingMsgs ? (
            <div className="flex justify-center py-12"><Loader2 /></div>
          ) : (
            messages.map((msg) => (
              <ChatMessageBubble key={msg.id} msg={msg} perspective="admin" />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {selected.status !== "closed" && (
          <form onSubmit={handleSend} className="border-t border-theme p-3">
            <label className="mb-2 flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={internalNote}
                onChange={(e) => setInternalNote(e.target.checked)}
              />
              یادداشت داخلی
            </label>
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.jpg,.jpeg,.png,.gif,.webp,.pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={sending || internalNote}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-theme hover:bg-[var(--accent-soft)] disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
              </button>
              <input
                type="text"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (selectedId) {
                    chatSocket?.typing(selectedId, true);
                    if (typingTimer.current) clearTimeout(typingTimer.current);
                    typingTimer.current = setTimeout(
                      () => chatSocket?.typing(selectedId!, false),
                      1500,
                    );
                  }
                }}
                placeholder={internalNote ? "یادداشت برای تیم…" : "پاسخ…"}
                className="flex-1 rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}
      </div>

      <AdminChatSidebar
        token={token}
        conversation={selected}
        onUpdate={updateConversation}
        onQuickReply={(text) => setDraft(text)}
        onExport={handleExport}
        liveVisits={liveVisits}
      />
    </>
  ) : null;

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">چت پشتیبانی</h1>
          <p className="text-sm text-muted">مدیریت گفتگوها، بازدیدکنندگان آنلاین و پیام proactive</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-theme p-0.5">
            <button
              type="button"
              onClick={() => setView("inbox")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                view === "inbox" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-muted",
              )}
            >
              گفتگوها
            </button>
            <button
              type="button"
              onClick={() => setView("online")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
                view === "online" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-muted",
              )}
            >
              <span className="h-2 w-2 rounded-full bg-green-500" />
              آنلاین
              {stats && stats.online_visitors > 0 && (
                <span className="rounded-full bg-green-500/20 px-1.5 text-xs text-green-700 dark:text-green-400">
                  {stats.online_visitors}
                </span>
              )}
            </button>
          </div>
          {stats && (
            <div className="flex gap-4 text-sm text-muted">
              <span><strong className="text-[var(--fg)]">{stats.open_count}</strong> باز</span>
              <span><strong className="text-[var(--fg)]">{stats.unread_total}</strong> خوانده‌نشده</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-theme">
        {view === "online" ? (
          <>
            <div className="flex w-[min(100%,420px)] shrink-0 flex-col border-l border-theme">
              <OnlineVisitorsPanel
                token={token}
                onOpenConversation={openConversation}
                onMessageSent={(convId) => {
                  refreshList();
                  openConversation(convId);
                }}
              />
            </div>
            <section className="flex min-w-0 flex-1 flex-col">
              {!selected ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted">
                  <p>یک بازدیدکننده را انتخاب کنید یا پیام proactive بفرستید</p>
                  <p className="text-xs">پیام مستقیماً روی صفحه مشتری نمایش داده می‌شود</p>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1">{chatPanelInner}</div>
              )}
            </section>
          </>
        ) : (
          <>
        {/* لیست گفتگوها */}
        <aside className="flex w-72 shrink-0 flex-col border-l border-theme bg-[var(--bg-elevated)]">
          <div className="space-y-2 border-b border-theme p-3">
            <input
              type="search"
              placeholder="جستجو نام، شماره، پیام…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && refreshList()}
              className="w-full rounded-lg border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm"
            />
            <div className="flex gap-1">
              {(["open", "closed", "all"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "flex-1 rounded-lg px-2 py-1 text-xs",
                    filter === f ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-muted",
                  )}
                >
                  {f === "open" ? "باز" : f === "closed" ? "بسته" : "همه"}
                </button>
              ))}
            </div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full rounded-lg border border-theme bg-[var(--input-bg)] px-2 py-1 text-xs"
            >
              <option value="">همه اولویت‌ها</option>
              <option value="urgent">فوری</option>
              <option value="high">بالا</option>
              <option value="normal">عادی</option>
              <option value="low">کم</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="flex justify-center p-8"><Loader2 /></div>
            ) : conversations.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">گفتگویی نیست</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "w-full border-b border-theme px-3 py-3 text-right transition hover:bg-[var(--sidebar-hover)]",
                    selectedId === c.id && "bg-[var(--sidebar-active)]",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="truncate text-sm font-medium">
                          {c.visitor_name || c.customer_name || c.visitor_phone || "بازدیدکننده"}
                        </p>
                        {c.priority !== "normal" && (
                          <span className={cn("text-[10px]", PRIORITY_COLORS[c.priority])}>●</span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted">{c.last_message_preview || "—"}</p>
                      {c.current_page_title && c.visitor_online && (
                        <p className="truncate text-[10px] text-green-600">📍 {c.current_page_title}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-[10px] text-muted">{formatRelative(c.last_message_at)}</span>
                      {c.admin_unread_count > 0 && (
                        <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] text-[var(--accent-fg)]">
                          {c.admin_unread_count}
                        </span>
                      )}
                      {c.visitor_online && <span className="h-2 w-2 rounded-full bg-green-500" />}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* پنل گفتگو */}
        <section className="flex min-w-0 flex-1 flex-col">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center text-muted">یک گفتگو را انتخاب کنید</div>
          ) : (
            <div className="flex min-h-0 flex-1">{chatPanelInner}</div>
          )}
        </section>
          </>
        )}
      </div>
    </div>
  );
}

function appendVisits(existing: ChatPageVisit[], incoming: ChatPageVisit[]): ChatPageVisit[] {
  const ids = new Set(existing.map((v) => v.id));
  const added = incoming.filter((v) => !ids.has(v.id));
  return [...existing, ...added];
}

"use client";

import { useEffect, useRef, useState } from "react";

import { MessageCircle, Send, Upload, X } from "@/components/icons";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { useChat } from "@/components/chat/ChatProvider";
import { chatSocket, getOrCreateVisitorId, uploadChatFile, validateChatFileClient } from "@/lib/chat";

export function ChatWidget() {
  const {
    open,
    setOpen,
    conversation,
    messages,
    loading,
    sending,
    unread,
    adminTyping,
    sendMessage,
    startConversation,
  } = useChat();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, adminTyping]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    await sendMessage(text);
  }

  async function handleFile(file: File) {
    if (!conversation?.id || sending) return;
    const err = validateChatFileClient(file);
    if (err) {
      alert(err);
      return;
    }
    const visitorId = getOrCreateVisitorId();
    const uploaded = await uploadChatFile(conversation.id, visitorId, file);
    await sendMessage("", {
      key: uploaded.attachment_key,
      name: uploaded.attachment_name,
      type: uploaded.message_type,
    });
  }

  function handleTyping(v: string) {
    setDraft(v);
    if (!conversation?.id) return;
    chatSocket?.typing(conversation.id, true);
    if (typingRef.current) clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => {
      chatSocket?.typing(conversation.id!, false);
    }, 1500);
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="چت پشتیبانی"
          onClick={() => {
            setOpen(true);
            if (!conversation) startConversation();
          }}
          className="chat-fab fixed bottom-20 left-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg sm:bottom-6"
        >
          <MessageCircle className="h-6 w-6" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="chat-panel fixed bottom-20 left-4 z-50 flex w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border border-theme shadow-2xl sm:bottom-6">
          <header className="flex items-center justify-between border-b border-theme px-4 py-3">
            <div>
              <p className="text-sm font-semibold">پشتیبانی آنلاین</p>
              <p className="text-xs text-muted">
                {adminTyping ? "در حال نوشتن…" : "معمولاً کمتر از ۵ دقیقه پاسخ می‌دهیم"}
              </p>
            </div>
            <button
              type="button"
              aria-label="بستن"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 hover:bg-[var(--accent-soft)]"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex max-h-[min(50vh,420px)] min-h-[280px] flex-1 flex-col overflow-y-auto bg-[var(--bg-elevated)] p-3">
            {loading && messages.length === 0 ? (
              <p className="m-auto text-sm text-muted">در حال بارگذاری…</p>
            ) : messages.length === 0 ? (
              <div className="m-auto text-center text-sm text-muted">
                <p>سلام! 👋</p>
                <p className="mt-1">سوال خود را بپرسید، تیم ما پاسخ می‌دهد.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <ChatMessageBubble key={msg.id} msg={msg} perspective="visitor" />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="flex gap-2 border-t border-theme p-3">
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
              aria-label="ارسال فایل"
              onClick={() => fileRef.current?.click()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-theme hover:bg-[var(--accent-soft)]"
              disabled={sending || !conversation}
            >
              <Upload className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={draft}
              onChange={(e) => handleTyping(e.target.value)}
              placeholder="پیام خود را بنویسید…"
              className="flex-1 rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

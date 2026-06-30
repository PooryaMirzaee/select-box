"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import {
  type ChatConversation,
  type ChatMessage,
  appendMessages,
  chatSocket,
  fetchChatConversation,
  fetchChatMessages,
  getOrCreateVisitorId,
  getStoredConversationId,
  markChatReadVisitor,
  mergeMessages,
  recordPageVisit,
  sendChatMessage,
  setStoredConversationId,
  startChat,
  type WsEvent,
} from "@/lib/chat";

type ChatContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  conversation: ChatConversation | null;
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  unread: number;
  adminTyping: boolean;
  startConversation: (initialMessage?: string) => Promise<void>;
  sendMessage: (body: string, attachment?: { key: string; name: string; type: string }) => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [proactiveUnread, setProactiveUnread] = useState(0);
  const visitorIdRef = useRef("");
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPageRef = useRef("");
  const wsReadyRef = useRef(false);
  const openRef = useRef(open);
  openRef.current = open;

  const unread = (conversation?.visitor_unread_count ?? 0) + proactiveUnread;

  const loadMessages = useCallback(async (convId: number, beforeId?: number) => {
    const visitorId = visitorIdRef.current || getOrCreateVisitorId();
    visitorIdRef.current = visitorId;
    const res = await fetchChatMessages(convId, visitorId, beforeId);
    if (beforeId) {
      setMessages((prev) => mergeMessages(res.items, prev));
    } else {
      setMessages(res.items);
    }
    setHasMore(res.has_more);
  }, []);

  const trackPage = useCallback(async (convId: number, pageUrl: string, pageTitle: string) => {
    if (pageUrl === lastPageRef.current) return;
    lastPageRef.current = pageUrl;
    const visitorId = visitorIdRef.current || getOrCreateVisitorId();
    try {
      await recordPageVisit(convId, visitorId, pageUrl, pageTitle);
    } catch {
      /* offline */
    }
  }, []);

  const sendBrowsePresence = useCallback(
    (pageUrl: string, pageTitle: string) => {
      if (!wsReadyRef.current) return;
      chatSocket?.browsePresence(pageUrl, pageTitle, conversation?.id);
    },
    [conversation?.id],
  );

  const startConversation = useCallback(
    async (initialMessage?: string) => {
      setLoading(true);
      try {
        const visitorId = getOrCreateVisitorId();
        visitorIdRef.current = visitorId;
        const pageUrl = typeof window !== "undefined" ? window.location.pathname : pathname;
        const pageTitle = typeof document !== "undefined" ? document.title : "";
        const conv = await startChat({
          visitor_id: visitorId,
          page_url: pageUrl,
          page_title: pageTitle,
          referrer_url: typeof document !== "undefined" ? document.referrer : undefined,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          initial_message: initialMessage,
        });
        setConversation(conv);
        setStoredConversationId(conv.id);
        setProactiveUnread(0);
        lastPageRef.current = pageUrl;
        await loadMessages(conv.id);
        chatSocket?.join(conv.id, visitorId);
        sendBrowsePresence(pageUrl, pageTitle);
      } finally {
        setLoading(false);
      }
    },
    [loadMessages, pathname, sendBrowsePresence],
  );

  // همیشه WebSocket متصل — حتی بدون باز کردن چت
  useEffect(() => {
    visitorIdRef.current = getOrCreateVisitorId();
    chatSocket?.connect("visitor");
    const unsub = chatSocket?.subscribe((ev: WsEvent) => {
      if (ev.type === "auth_ok") {
        wsReadyRef.current = true;
        chatSocket?.browsePresence(
          window.location.pathname,
          document.title,
          getStoredConversationId() ?? undefined,
        );
      }
      if (ev.type === "proactive_message") {
        setConversation(ev.conversation);
        setStoredConversationId(ev.conversation.id);
        setMessages((prev) => appendMessages(prev, [ev.message]));
        setProactiveUnread((n) => n + 1);
        chatSocket?.join(ev.conversation.id, visitorIdRef.current);
      }
      if (ev.type === "message" && ev.message.message_type !== "internal") {
        setMessages((prev) => appendMessages(prev, [ev.message]));
        if (ev.conversation) {
          setConversation(ev.conversation);
          setStoredConversationId(ev.conversation.id);
        }
        if (!openRef.current && ev.message.sender_type === "admin") {
          setProactiveUnread((n) => n + 1);
        }
      }
      if (ev.type === "typing" && ev.role === "staff") {
        setAdminTyping(ev.is_typing);
        if (ev.is_typing) {
          if (typingTimer.current) clearTimeout(typingTimer.current);
          typingTimer.current = setTimeout(() => setAdminTyping(false), 3000);
        }
      }
    });
    return () => {
      unsub?.();
    };
  }, []);

  useEffect(() => {
    visitorIdRef.current = getOrCreateVisitorId();
    const storedId = getStoredConversationId();
    if (storedId) {
      setLoading(true);
      Promise.all([
        fetchChatConversation(storedId, visitorIdRef.current),
        loadMessages(storedId),
      ])
        .then(([conv]) => {
          setConversation(conv);
          lastPageRef.current = conv.current_page_url ?? "";
          chatSocket?.join(storedId, visitorIdRef.current);
        })
        .catch(() => setStoredConversationId(null))
        .finally(() => setLoading(false));
    }
  }, [loadMessages]);

  useEffect(() => {
    const pageUrl = pathname;
    const pageTitle = document.title;
    sendBrowsePresence(pageUrl, pageTitle);
    if (conversation?.id) {
      trackPage(conversation.id, pageUrl, pageTitle);
    }
  }, [pathname, conversation?.id, trackPage, sendBrowsePresence]);

  useEffect(() => {
    if (open && conversation?.id) {
      markChatReadVisitor(conversation.id, visitorIdRef.current).catch(() => {});
      chatSocket?.markRead(conversation.id);
      setProactiveUnread(0);
      setConversation((c) => (c ? { ...c, visitor_unread_count: 0 } : c));
    }
  }, [open, conversation?.id]);

  const sendMessage = useCallback(
    async (
      body: string,
      attachment?: { key: string; name: string; type: string },
    ) => {
      if (!conversation?.id) {
        await startConversation(body || attachment?.name);
        return;
      }
      setSending(true);
      try {
        const msg = await sendChatMessage(conversation.id, visitorIdRef.current, {
          body: body || "",
          attachment_key: attachment?.key,
          attachment_name: attachment?.name,
          message_type: attachment?.type,
        });
        setMessages((prev) => appendMessages(prev, [msg]));
        chatSocket?.typing(conversation.id, false);
      } finally {
        setSending(false);
      }
    },
    [conversation?.id, startConversation],
  );

  const loadMore = useCallback(async () => {
    if (!conversation?.id || !hasMore || messages.length === 0) return;
    await loadMessages(conversation.id, messages[0].id);
  }, [conversation?.id, hasMore, loadMessages, messages]);

  const value = useMemo<ChatContextValue>(
    () => ({
      open,
      setOpen,
      conversation,
      messages,
      loading,
      sending,
      unread,
      adminTyping,
      startConversation,
      sendMessage,
      loadMore,
      hasMore,
    }),
    [
      open,
      conversation,
      messages,
      loading,
      sending,
      unread,
      adminTyping,
      startConversation,
      sendMessage,
      loadMore,
      hasMore,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

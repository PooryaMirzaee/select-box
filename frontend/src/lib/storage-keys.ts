export const STORAGE_KEYS = {
  sessionId: "selectbox_session_id",
  authToken: "selectbox_token",
  adminToken: "selectbox_admin_token",
  theme: "selectbox_theme",
  chatVisitorId: "selectbox_chat_visitor_id",
  chatConversationId: "selectbox_chat_conversation_id",
  analyticsSessionId: "selectbox_analytics_session_id",
} as const;

export const CART_EVENTS = {
  update: "selectbox:cart",
  open: "selectbox:cart-open",
} as const;

export const DRAFT_KEY_PREFIX = "selectbox-draft-";

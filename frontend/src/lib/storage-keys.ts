export const STORAGE_KEYS = {
  sessionId: "coralay_session_id",
  authToken: "coralay_token",
  adminToken: "coralay_admin_token",
  theme: "coralay_theme",
  chatVisitorId: "coralay_chat_visitor_id",
  chatConversationId: "coralay_chat_conversation_id",
  analyticsSessionId: "coralay_analytics_session_id",
} as const;

export const CART_EVENTS = {
  update: "coralay:cart",
  open: "coralay:cart-open",
} as const;

export const DRAFT_KEY_PREFIX = "coralay-design-";

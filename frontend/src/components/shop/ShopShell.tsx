"use client";

import { CartProvider } from "@/components/shop/CartProvider";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { ChatWidget } from "@/components/chat/ChatWidget";

export function ShopShell({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <ChatProvider>
        {children}
        <ChatWidget />
      </ChatProvider>
    </CartProvider>
  );
}

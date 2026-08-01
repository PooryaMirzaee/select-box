"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { CartDrawer } from "@/components/shop/CartDrawer";
import { getCartClient, type Cart } from "@/lib/api";
import { CART_EVENTS } from "@/lib/storage-keys";

type CartContextValue = {
  cart: Cart | null;
  loading: boolean;
  itemCount: number;
  open: boolean;
  openCart: () => void;
  closeCart: () => void;
  refreshCart: () => Promise<void>;
  applyCart: (cart: Cart | null) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const refreshSeq = useRef(0);

  const applyCart = useCallback((next: Cart | null) => {
    refreshSeq.current += 1;
    setCart(next);
    setLoading(false);
  }, []);

  const refreshCart = useCallback(async () => {
    const seq = ++refreshSeq.current;
    setLoading(true);
    try {
      const c = await getCartClient();
      if (seq === refreshSeq.current) {
        setCart(c);
      }
    } catch {
      if (seq === refreshSeq.current) {
        // خطای شبکه را به معنای سبد خالی نگیر
        setCart((prev) => prev);
      }
    } finally {
      if (seq === refreshSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setDrawerMounted(true);
    void refreshCart();

    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<Cart | undefined>).detail;
      if (detail && typeof detail === "object" && Array.isArray(detail.items)) {
        applyCart(detail);
        return;
      }
      void refreshCart();
    };

    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<Cart | undefined>).detail;
      if (detail && typeof detail === "object" && Array.isArray(detail.items)) {
        applyCart(detail);
        setOpen(true);
        return;
      }
      void refreshCart().then(() => setOpen(true));
    };

    window.addEventListener(CART_EVENTS.update, onUpdate);
    window.addEventListener(CART_EVENTS.open, onOpen);
    return () => {
      window.removeEventListener(CART_EVENTS.update, onUpdate);
      window.removeEventListener(CART_EVENTS.open, onOpen);
    };
  }, [refreshCart, applyCart]);

  const itemCount = useMemo(
    () => cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0,
    [cart],
  );

  const value = useMemo(
    () => ({
      cart,
      loading,
      itemCount,
      open,
      openCart: () => {
        void refreshCart().then(() => setOpen(true));
      },
      closeCart: () => setOpen(false),
      refreshCart,
      applyCart,
    }),
    [cart, loading, itemCount, open, refreshCart, applyCart],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      {drawerMounted ? <CartDrawer /> : null}
    </CartContext.Provider>
  );
}

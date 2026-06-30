"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { CartDrawer } from "@/components/shop/CartDrawer";
import { getCartClient, type Cart } from "@/lib/api";
import { CART_EVENTS } from "@/lib/storage-keys";

type CartContextValue = {
  cart: Cart | null;
  itemCount: number;
  open: boolean;
  openCart: () => void;
  closeCart: () => void;
  refreshCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [open, setOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);

  const refreshCart = useCallback(async () => {
    try {
      const c = await getCartClient();
      setCart(c);
    } catch {
      setCart(null);
    }
  }, []);

  useEffect(() => {
    setDrawerMounted(true);
    refreshCart();
    const onUpdate = () => refreshCart();
    const onOpen = () => {
      refreshCart().then(() => setOpen(true));
    };
    window.addEventListener(CART_EVENTS.update, onUpdate);
    window.addEventListener(CART_EVENTS.open, onOpen);
    return () => {
      window.removeEventListener(CART_EVENTS.update, onUpdate);
      window.removeEventListener(CART_EVENTS.open, onOpen);
    };
  }, [refreshCart]);

  const itemCount = useMemo(
    () => cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0,
    [cart],
  );

  const value = useMemo(
    () => ({
      cart,
      itemCount,
      open,
      openCart: () => {
        refreshCart().then(() => setOpen(true));
      },
      closeCart: () => setOpen(false),
      refreshCart,
    }),
    [cart, itemCount, open, refreshCart],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      {drawerMounted ? <CartDrawer /> : null}
    </CartContext.Provider>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2 } from "@/components/icons";

import { Button } from "@/components/ui/Button";
import { CART_EVENTS } from "@/lib/storage-keys";
import {
  getCartClient,
  removeCartItem,
  updateCartItem,
  type Cart,
} from "@/lib/api";
import { formatToman } from "@/lib/utils";

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getCartClient()
      .then(setCart)
      .catch(() => setCart(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const subtotal =
    cart?.items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0) ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-semibold sm:text-3xl">سبد خرید</h1>
      {loading ? (
        <p className="mt-8 text-muted">در حال بارگذاری...</p>
      ) : !cart?.items.length ? (
        <div className="card-theme mt-12 p-10 text-center">
          <p className="text-muted">سبد شما خالی است.</p>
          <Link href="/catalog" className="mt-6 inline-block">
            <Button>رفتن به کاتالوگ</Button>
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-10 space-y-4">
            {cart.items.map((item) => (
              <li
                key={item.id}
                className="card-theme flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div className="flex items-center gap-4">
                  {item.preview_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.preview_url} alt="" className="h-16 w-16 rounded-lg border border-theme object-cover" />
                  ) : null}
                  <div>
                    <p className="font-medium">{item.title}</p>
                    {item.is_custom ? (
                      <span className="text-[10px] text-[var(--accent)]">سفارشی</span>
                    ) : null}
                    <p className="text-xs text-muted">{item.sku}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    className="input-theme w-16 px-2 py-1 text-center"
                    onChange={(e) => {
                      const q = parseInt(e.target.value, 10);
                      if (q > 0) {
                        updateCartItem(item.id, q).then((c) => {
                          setCart(c);
                          window.dispatchEvent(new Event(CART_EVENTS.update));
                        });
                      }
                    }}
                  />
                  <p className="min-w-[100px] text-left text-sm">
                    {formatToman(Number(item.unit_price) * item.quantity)}
                  </p>
                  <button
                    type="button"
                    className="text-muted transition hover:text-red-400"
                    onClick={() =>
                      removeCartItem(item.id).then((c) => {
                        setCart(c);
                        window.dispatchEvent(new Event(CART_EVENTS.update));
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="card-theme mt-8 flex flex-wrap items-center justify-between gap-4 p-6">
            <p className="text-lg">
              جمع: <span className="font-semibold text-[var(--accent)]">{formatToman(subtotal)}</span>
            </p>
            <Link href="/checkout">
              <Button size="lg">ادامه خرید</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

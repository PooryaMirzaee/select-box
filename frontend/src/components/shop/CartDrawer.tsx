"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingBag, Trash2, X } from "@/components/icons";

import { useCart } from "@/components/shop/CartProvider";
import { Button } from "@/components/ui/Button";
import { removeCartItem, updateCartItem } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { CART_EVENTS } from "@/lib/storage-keys";
import { cn, formatToman } from "@/lib/utils";

export function CartDrawer() {
  const { cart, loading, open, closeCart, applyCart } = useCart();
  const [busyLine, setBusyLine] = useState<number | null>(null);

  const subtotal =
    cart?.items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0) ?? 0;

  async function changeQty(lineId: number, next: number) {
    setBusyLine(lineId);
    try {
      const nextCart =
        next <= 0 ? await removeCartItem(lineId) : await updateCartItem(lineId, next);
      applyCart(nextCart);
      window.dispatchEvent(new CustomEvent(CART_EVENTS.update, { detail: nextCart }));
    } finally {
      setBusyLine(null);
    }
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeCart}
        aria-hidden={!open}
      />
      <aside
        className={cn(
          "fixed inset-y-0 end-0 z-50 flex w-full max-w-md flex-col border-s border-theme bg-card shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full",
        )}
        aria-hidden={!open}
        role="dialog"
        aria-label="سبد خرید"
      >
        <div className="flex items-center justify-between border-b border-theme px-4 py-3">
          <h2 className="text-lg font-semibold">سبد خرید</h2>
          <button
            type="button"
            onClick={closeCart}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]"
            aria-label="بستن"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {loading && !cart?.items.length ? (
            <div className="space-y-4 py-4">
              {[0, 1].map((i) => (
                <div key={i} className="skeleton h-24 rounded-2xl" />
              ))}
            </div>
          ) : !cart?.items.length ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)]">
                <ShoppingBag className="h-7 w-7 text-[var(--accent)]" />
              </span>
              <p className="text-sm text-muted">سبد خرید شما خالی است</p>
              <Link href="/catalog" onClick={closeCart}>
                <Button variant="outline" size="sm">
                  مشاهده محصولات
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {cart.items.map((line) => {
                const busy = busyLine === line.id;
                return (
                  <li key={line.id} className="border-b border-theme pb-4 last:border-b-0">
                    <div className="flex gap-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-theme bg-[var(--bg-elevated)]">
                        {line.preview_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mediaUrl(line.preview_url)}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center text-muted">
                            <ShoppingBag className="h-5 w-5 opacity-50" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium leading-snug">{line.title}</p>
                        {line.is_custom ? (
                          <span className="mt-0.5 inline-block rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] text-[var(--accent)]">
                            سفارشی
                          </span>
                        ) : null}
                        <p className="mt-1.5 text-sm">
                          <span className="font-bold">{formatToman(line.unit_price, false)}</span>
                          <span className="ms-1 text-[11px] text-muted">تومان</span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-1">
                      <div
                        className={cn(
                          "flex items-center rounded-full border border-theme transition",
                          busy && "opacity-50",
                        )}
                      >
                        <button
                          type="button"
                          disabled={busy}
                          className="flex min-h-[40px] min-w-[40px] items-center justify-center text-base transition hover:text-[var(--accent)]"
                          onClick={() => changeQty(line.id, line.quantity + 1)}
                          aria-label="افزایش تعداد"
                        >
                          +
                        </button>
                        <span className="min-w-[1.75rem] text-center text-sm font-medium">
                          {line.quantity.toLocaleString("fa-IR")}
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          className="flex min-h-[40px] min-w-[40px] items-center justify-center text-base transition hover:text-[var(--accent)]"
                          onClick={() => changeQty(line.id, line.quantity - 1)}
                          aria-label="کاهش تعداد"
                        >
                          −
                        </button>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        className="ms-auto flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-muted transition hover:text-[var(--danger)]"
                        onClick={() => changeQty(line.id, 0)}
                        aria-label="حذف از سبد"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {cart && cart.items.length > 0 ? (
          <div className="border-t border-theme p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-muted">جمع سبد</span>
              <span className="text-base">
                <span className="font-bold">{formatToman(String(subtotal), false)}</span>
                <span className="ms-1 text-[11px] text-muted">تومان</span>
              </span>
            </div>
            <Link href="/checkout" onClick={closeCart} className="block">
              <Button className="w-full" size="lg">
                ادامه و پرداخت
              </Button>
            </Link>
            <Link
              href="/cart"
              onClick={closeCart}
              className="mt-2 flex min-h-[44px] items-center justify-center text-center text-xs text-muted transition hover:text-[var(--fg)]"
            >
              مشاهده سبد کامل
            </Link>
          </div>
        ) : null}
      </aside>
    </>
  );
}

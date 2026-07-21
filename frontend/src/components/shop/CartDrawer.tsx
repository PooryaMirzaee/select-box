"use client";

import Link from "next/link";
import { X } from "@/components/icons";

import { useCart } from "@/components/shop/CartProvider";
import { Button } from "@/components/ui/Button";
import { removeCartItem, updateCartItem } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { cn, formatToman } from "@/lib/utils";

export function CartDrawer() {
  const { cart, open, closeCart, refreshCart } = useCart();

  const subtotal =
    cart?.items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0) ?? 0;

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
        <div className="flex items-center justify-between border-b border-theme px-4 py-4">
          <h2 className="text-lg font-semibold">سبد خرید</h2>
          <button
            type="button"
            onClick={closeCart}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted hover:bg-[var(--bg-elevated)]"
            aria-label="بستن"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!cart?.items.length ? (
            <p className="py-12 text-center text-sm text-muted">سبد خالی است</p>
          ) : (
            <ul className="space-y-4">
              {cart.items.map((line) => (
                <li key={line.id} className="border-b border-theme pb-4">
                  <div className="flex gap-3">
                    {line.preview_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaUrl(line.preview_url)}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-lg border border-theme object-cover"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{line.title}</p>
                      {line.is_custom ? (
                        <span className="mt-0.5 inline-block rounded bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] text-[var(--accent)]">
                          سفارشی
                        </span>
                      ) : null}
                      <p className="mt-0.5 font-mono text-xs text-muted">{line.sku}</p>
                      <p className="mt-2 text-sm">{formatToman(line.unit_price)}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-theme text-sm"
                      onClick={async () => {
                        if (line.quantity <= 1) {
                          await removeCartItem(line.id);
                        } else {
                          await updateCartItem(line.id, line.quantity - 1);
                        }
                        await refreshCart();
                      }}
                    >
                      −
                    </button>
                    <span className="min-w-[1.5rem] text-center text-sm">{line.quantity}</span>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-theme text-sm"
                      onClick={async () => {
                        await updateCartItem(line.id, line.quantity + 1);
                        await refreshCart();
                      }}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="ms-auto text-xs text-red-400"
                      onClick={async () => {
                        await removeCartItem(line.id);
                        await refreshCart();
                      }}
                    >
                      حذف
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart && cart.items.length > 0 ? (
          <div className="border-t border-theme p-4">
            <div className="mb-4 flex justify-between text-sm">
              <span className="text-muted">جمع</span>
              <span className="font-semibold">{formatToman(String(subtotal))}</span>
            </div>
            <Link href="/checkout" onClick={closeCart}>
              <Button className="w-full">تسویه حساب</Button>
            </Link>
            <Link
              href="/cart"
              onClick={closeCart}
              className="mt-2 block text-center text-xs text-muted hover:text-[var(--fg)]"
            >
              مشاهده سبد کامل
            </Link>
          </div>
        ) : null}
      </aside>
    </>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBag, Trash2 } from "@/components/icons";

import { Button } from "@/components/ui/Button";
import { CART_EVENTS } from "@/lib/storage-keys";
import {
  getCartClient,
  removeCartItem,
  updateCartItem,
  type Cart,
} from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { cn, formatToman } from "@/lib/utils";

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyLine, setBusyLine] = useState<number | null>(null);

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

  async function changeQty(lineId: number, next: number) {
    setBusyLine(lineId);
    try {
      const c = next <= 0 ? await removeCartItem(lineId) : await updateCartItem(lineId, next);
      setCart(c);
      window.dispatchEvent(new Event(CART_EVENTS.update));
    } finally {
      setBusyLine(null);
    }
  }

  const subtotal =
    cart?.items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0) ?? 0;
  const itemCount = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-semibold sm:text-3xl">سبد خرید</h1>
      {loading ? (
        <div className="mt-8 space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : !cart?.items.length ? (
        <div className="card-theme mt-10 flex flex-col items-center gap-4 p-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <ShoppingBag className="h-7 w-7 text-[var(--accent)]" />
          </span>
          <p className="text-muted">سبد شما خالی است.</p>
          <Link href="/catalog">
            <Button>مشاهده محصولات</Button>
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            {itemCount.toLocaleString("fa-IR")} کالا در سبد شما
          </p>
          <ul className="mt-6 space-y-4">
            {cart.items.map((item) => {
              const busy = busyLine === item.id;
              return (
                <li key={item.id} className="card-theme p-4 sm:p-5">
                  <div className="flex gap-3 sm:gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-theme bg-[var(--bg-elevated)]">
                      {item.preview_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mediaUrl(item.preview_url)}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-muted">
                          <ShoppingBag className="h-6 w-6 opacity-50" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-medium leading-snug">{item.title}</p>
                      {item.is_custom ? (
                        <span className="mt-1 inline-block rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] text-[var(--accent)]">
                          سفارشی
                        </span>
                      ) : null}
                      <p className="mt-2 text-sm sm:text-base">
                        <span className="font-bold">
                          {formatToman(Number(item.unit_price) * item.quantity, false)}
                        </span>
                        <span className="ms-1 text-[11px] text-muted">تومان</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1">
                    <div
                      className={cn(
                        "flex items-center rounded-full border border-theme",
                        busy && "opacity-50",
                      )}
                    >
                      <button
                        type="button"
                        disabled={busy}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center text-lg transition hover:text-[var(--accent)]"
                        onClick={() => changeQty(item.id, item.quantity + 1)}
                        aria-label="افزایش تعداد"
                      >
                        +
                      </button>
                      <span className="min-w-[2rem] text-center font-medium">
                        {item.quantity.toLocaleString("fa-IR")}
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center text-lg transition hover:text-[var(--accent)]"
                        onClick={() => changeQty(item.id, item.quantity - 1)}
                        aria-label="کاهش تعداد"
                      >
                        −
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      className="ms-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition hover:text-[var(--danger)]"
                      onClick={() => changeQty(item.id, 0)}
                      aria-label="حذف از سبد"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* جمع‌بندی — روی موبایل چسبان بالای ناوبری پایین */}
          <div className="card-theme sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 mt-6 flex flex-wrap items-center justify-between gap-4 p-4 sm:static sm:p-6">
            <div>
              <p className="text-xs text-muted">جمع سبد</p>
              <p className="text-lg">
                <span className="font-bold">{formatToman(subtotal, false)}</span>
                <span className="ms-1 text-xs text-muted">تومان</span>
              </p>
            </div>
            <Link href="/checkout" className="flex-1 sm:flex-none">
              <Button size="lg" className="w-full sm:w-auto">
                ادامه و پرداخت
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

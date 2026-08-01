"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { RotateCcw, ShieldCheck, Truck } from "@/components/icons";
import { ProductSizeGuideModal } from "@/components/shop/ProductSizeGuide";
import { addToCart, type ProductDetail, type VariationPublic } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { sizeGuideHasContent } from "@/lib/size-guide";
import { CART_EVENTS } from "@/lib/storage-keys";
import { cn, formatToman } from "@/lib/utils";

const TRUST_ITEMS = [
  { icon: Truck, label: "ارسال به سراسر کشور" },
  { icon: ShieldCheck, label: "ضمانت اصالت کالا" },
  { icon: RotateCcw, label: "۷ روز مهلت بازگشت" },
] as const;

function isPlainVariation(v: VariationPublic): boolean {
  return !(v.color_name || "").trim() && !(v.size_label || "").trim();
}

export function AddToCart({ product }: { product: ProductDetail }) {
  const [selected, setSelected] = useState<VariationPublic | null>(
    product.variations[0] ?? null,
  );
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const showSizeGuide = product.size_guide && sizeGuideHasContent(product.size_guide);

  const colors = [...new Set(product.variations.map((v) => v.color_name).filter(Boolean))] as string[];
  const hasSizedOptions = product.variations.some((v) => !!(v.size_label || "").trim());
  const isSimpleProduct =
    product.variations.length === 1 && product.variations[0] && isPlainVariation(product.variations[0]);

  const sizes = product.variations.filter(
    (v) => !selected?.color_name || v.color_name === selected.color_name,
  );

  async function handleAdd() {
    const target = selected ?? product.variations[0] ?? null;
    if (!target || target.stock_quantity < 1) {
      setMsg(target ? "این گزینه ناموجود است" : "گزینه‌ای برای خرید نیست");
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      await addToCart(target.id, qty);
      trackEvent("add_to_cart", window.location.pathname, {
        product_id: product.id,
        product_slug: product.slug,
        variation_id: target.id,
        quantity: qty,
      });
      window.dispatchEvent(new Event(CART_EVENTS.update));
      window.dispatchEvent(new Event(CART_EVENTS.open));
      setMsg("به سبد اضافه شد");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "خطا در افزودن به سبد");
    } finally {
      setLoading(false);
    }
  }

  const price = selected?.unit_price ?? product.effective_price;
  const canAdd =
    product.in_stock &&
    !!(selected ?? product.variations[0]) &&
    (selected ?? product.variations[0])!.stock_quantity > 0;

  return (
    <div className="card-theme space-y-6 p-5 sm:p-6">
      <div>
        <p className="text-xs text-muted">قیمت</p>
        <p className="text-2xl sm:text-3xl">
          <span className="font-bold">{formatToman(price, false)}</span>
          <span className="ms-1.5 text-sm font-normal text-muted">تومان</span>
        </p>
        {product.compare_at_price ? (
          <p className="text-sm text-muted line-through">{formatToman(product.compare_at_price)}</p>
        ) : null}
      </div>

      {!isSimpleProduct && colors.length > 0 ? (
        <div>
          <p className="mb-2 text-xs text-muted">رنگ</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
              const v = product.variations.find((x) => x.color_name === c);
              if (!v) return null;
              const swatch = v.color_hex?.startsWith("#") ? v.color_hex : undefined;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelected(v)}
                  className={cn(
                    "flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                    selected?.color_name === c
                      ? "border-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-theme text-muted",
                  )}
                >
                  {swatch ? (
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-white/20"
                      style={{ backgroundColor: swatch }}
                      aria-hidden
                    />
                  ) : null}
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {!isSimpleProduct && hasSizedOptions ? (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs text-muted">سایز</p>
            {showSizeGuide ? (
              <button
                type="button"
                onClick={() => setSizeGuideOpen(true)}
                className="text-xs text-[var(--accent)] underline-offset-2 hover:underline"
              >
                {product.size_guide!.title}
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes
              .filter((v) => !!(v.size_label || "").trim())
              .map((v) => (
                <button
                  key={v.id}
                  type="button"
                  disabled={v.stock_quantity < 1}
                  onClick={() => setSelected(v)}
                  className={cn(
                    "min-h-[44px] min-w-[3rem] rounded-xl border px-3 py-2 text-sm transition",
                    selected?.id === v.id
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--fg)]"
                      : "border-theme text-muted",
                    v.stock_quantity < 1 && "opacity-40",
                  )}
                >
                  {v.size_label}
                </button>
              ))}
          </div>
        </div>
      ) : showSizeGuide && !isSimpleProduct ? (
        <button
          type="button"
          onClick={() => setSizeGuideOpen(true)}
          className="text-xs text-[var(--accent)] underline-offset-2 hover:underline"
        >
          {product.size_guide!.title}
        </button>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center justify-center rounded-full border border-theme">
          <button
            type="button"
            className="min-h-[44px] min-w-[44px] text-lg transition hover:text-[var(--accent)]"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="کم کردن"
          >
            −
          </button>
          <span className="min-w-[2rem] text-center font-medium">
            {qty.toLocaleString("fa-IR")}
          </span>
          <button
            type="button"
            className="min-h-[44px] min-w-[44px] text-lg transition hover:text-[var(--accent)]"
            onClick={() => setQty((q) => q + 1)}
            aria-label="زیاد کردن"
          >
            +
          </button>
        </div>
        <Button className="w-full sm:flex-1" disabled={loading || !canAdd} onClick={handleAdd}>
          {loading ? "در حال افزودن…" : canAdd ? "افزودن به سبد خرید" : "ناموجود"}
        </Button>
      </div>
      {msg ? (
        <p
          role="status"
          className={cn(
            "text-sm",
            msg.includes("سبد") ? "text-[var(--success)]" : "text-[var(--danger)]",
          )}
        >
          {msg}
        </p>
      ) : null}

      <ul className="grid grid-cols-3 gap-2 border-t border-theme pt-4">
        {TRUST_ITEMS.map(({ icon: Icon, label }) => (
          <li key={label} className="flex flex-col items-center gap-1.5 text-center">
            <Icon className="h-5 w-5 text-[var(--accent)]" />
            <span className="text-[11px] leading-tight text-muted">{label}</span>
          </li>
        ))}
      </ul>

      {showSizeGuide ? (
        <ProductSizeGuideModal
          guide={product.size_guide!}
          open={sizeGuideOpen}
          onClose={() => setSizeGuideOpen(false)}
        />
      ) : null}

      {/* نوار خرید چسبان موبایل — همیشه در دسترس */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-theme bg-header pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base">
              <span className="font-bold">{formatToman(price, false)}</span>
              <span className="ms-1 text-[11px] text-muted">تومان</span>
            </p>
            {selected?.color_name || selected?.size_label ? (
              <p className="truncate text-[11px] text-muted">
                {[selected?.color_name, selected?.size_label].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
          <Button
            className="shrink-0 px-6"
            disabled={loading || !canAdd}
            onClick={handleAdd}
          >
            {loading ? "…" : canAdd ? "افزودن به سبد" : "ناموجود"}
          </Button>
        </div>
      </div>
    </div>
  );
}

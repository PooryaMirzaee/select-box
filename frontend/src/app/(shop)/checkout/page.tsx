"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  createOrder,
  fetchShopSettings,
  getCartClient,
  initiateCardTransfer,
  initiatePayment,
  validateCoupon,
  type Cart,
  type ShopSettings,
} from "@/lib/api";
import { formatToman } from "@/lib/utils";

type PaymentMethod = "online" | "card_transfer";

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [form, setForm] = useState({ name: "", phone: "", city: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("online");

  useEffect(() => {
    getCartClient().then(setCart).catch(() => setCart(null));
    fetchShopSettings().then(setShop).catch(() => null);
  }, []);

  const cardTransferAvailable = Boolean(
    shop?.card_transfer_enabled && shop.card_number?.trim(),
  );

  const subtotal = cart?.items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0) ?? 0;
  const shipping = subtotal > 0 ? (shop?.shipping_flat_toman ?? 4900) : 0;
  const total = subtotal - discount + shipping;

  async function applyCoupon() {
    if (!coupon.trim()) return;
    try {
      const r = await validateCoupon(coupon.trim(), String(subtotal));
      setDiscount(Number(r.discount));
    } catch {
      setDiscount(0);
      alert("کد تخفیف نامعتبر است");
    }
  }

  async function pay() {
    if (!form.name || !form.phone || !form.address) {
      alert("لطفاً آدرس را کامل کنید");
      return;
    }
    setLoading(true);
    try {
      const order = await createOrder({
        coupon_code: coupon || undefined,
        shipping_address: form,
      });

      if (paymentMethod === "card_transfer" && cardTransferAvailable) {
        const cardPay = await initiateCardTransfer(order.order_id);
        router.push(cardPay.payment_url);
        return;
      }

      const pay = await initiatePayment(order.order_id);
      if (pay.gateway === "zarinpal" && pay.payment_url.startsWith("http")) {
        window.location.href = pay.payment_url;
        return;
      }
      router.push(pay.payment_url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطا در ثبت سفارش");
    } finally {
      setLoading(false);
    }
  }

  if (!cart?.items.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-muted">سبد خالی است.</div>
    );
  }

  const onlineLabel = shop?.payment_gateway === "zarinpal" ? "پرداخت آنلاین (زرین‌پال)" : "پرداخت آنلاین";

  const payButtonLabel =
    paymentMethod === "card_transfer"
      ? "ادامه — کارت‌به‌کارت"
      : loading
        ? "در حال انتقال..."
        : `پرداخت با ${shop?.payment_gateway === "zarinpal" ? "زرین‌پال" : "درگاه آنلاین"}`;

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 lg:grid-cols-2 lg:py-14">
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold sm:text-3xl">تسویه حساب</h1>
        <div className="space-y-4 rounded-2xl border border-theme bg-card p-5">
          <input
            placeholder="نام و نام خانوادگی"
            className="w-full rounded-xl border border-theme bg-[var(--bg)] px-4 py-3"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            placeholder="شماره موبایل"
            className="w-full rounded-xl border border-theme bg-[var(--bg)] px-4 py-3"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            placeholder="شهر"
            className="w-full rounded-xl border border-theme bg-[var(--bg)] px-4 py-3"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <textarea
            placeholder="آدرس کامل"
            rows={3}
            className="w-full rounded-xl border border-theme bg-[var(--bg)] px-4 py-3"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <div className="flex gap-2">
          <input
            placeholder="کد تخفیف"
            className="flex-1 rounded-xl border border-theme bg-card px-4 py-3"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
          />
          <Button variant="outline" onClick={applyCoupon}>
            اعمال
          </Button>
        </div>
      </div>
      <div className="h-fit rounded-2xl border border-theme bg-card p-6 sm:p-8">
        <h2 className="text-lg font-medium">خلاصه سفارش</h2>
        <dl className="mt-6 space-y-3 text-sm text-muted">
          <div className="flex justify-between">
            <dt>جمع کالا</dt>
            <dd>{formatToman(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>تخفیف</dt>
            <dd className="text-green-600 dark:text-green-400">−{formatToman(discount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>ارسال</dt>
            <dd>{formatToman(shipping)}</dd>
          </div>
          <div className="flex justify-between border-t border-theme pt-4 text-base text-[var(--fg)]">
            <dt>مبلغ قابل پرداخت</dt>
            <dd className="font-semibold">{formatToman(total)}</dd>
          </div>
        </dl>

        {cardTransferAvailable ? (
          <div className="mt-6 space-y-2">
            <p className="text-sm font-medium">روش پرداخت</p>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-theme px-4 py-3 has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent)]/5">
              <input
                type="radio"
                name="payment_method"
                checked={paymentMethod === "online"}
                onChange={() => setPaymentMethod("online")}
              />
              <span className="text-sm">{onlineLabel}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-theme px-4 py-3 has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent)]/5">
              <input
                type="radio"
                name="payment_method"
                checked={paymentMethod === "card_transfer"}
                onChange={() => setPaymentMethod("card_transfer")}
              />
              <span className="text-sm">کارت‌به‌کارت + آپلود رسید</span>
            </label>
          </div>
        ) : null}

        <Button className="mt-8 w-full" size="lg" disabled={loading} onClick={pay}>
          {loading ? "در حال پردازش..." : payButtonLabel}
        </Button>
      </div>
    </div>
  );
}

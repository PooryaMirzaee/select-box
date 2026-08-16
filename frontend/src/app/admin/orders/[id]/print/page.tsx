"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { adminFetch, type OrderAdminDetail, type ShopSettingsAdmin } from "@/lib/api";
import { orderStatusLabel } from "@/lib/admin-status";
import { formatToman } from "@/lib/utils";

export default function OrderPrintPage() {
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);
  const [order, setOrder] = useState<OrderAdminDetail | null>(null);
  const [shop, setShop] = useState<ShopSettingsAdmin | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("selectbox_admin_token");
    if (!token || !Number.isFinite(orderId)) return;
    Promise.all([
      adminFetch<OrderAdminDetail>(`/api/v1/admin/orders/${orderId}`, token),
      adminFetch<ShopSettingsAdmin>("/api/v1/admin/settings", token),
    ]).then(([o, s]) => {
      setOrder(o);
      setShop(s);
      setTimeout(() => window.print(), 400);
    }).catch(() => undefined);
  }, [orderId]);

  if (!order) return <p className="p-8 text-muted">در حال آماده‌سازی فاکتور…</p>;

  const addr = order.shipping_address || {};
  const shopName = shop?.legal_company_name || shop?.shop_name || "فروشگاه";

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-black print:p-0">
      <div className="flex items-start justify-between border-b border-zinc-300 pb-4">
        <div>
          <h1 className="text-xl font-bold">{shopName}</h1>
          {shop?.national_id ? <p className="text-sm">شناسه ملی: {shop.national_id}</p> : null}
          {shop?.contact_phone ? <p className="text-sm">{shop.contact_phone}</p> : null}
          {shop?.contact_address ? <p className="text-sm">{shop.contact_address}</p> : null}
        </div>
        <div className="text-left text-sm">
          <p>فاکتور فروش</p>
          <p className="font-mono text-lg">{order.tracking_code}</p>
          <p>{orderStatusLabel(order.status)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium">گیرنده</p>
          <p>{String(addr.full_name || addr.name || "—")}</p>
          <p dir="ltr">{String(addr.phone || addr.mobile || "")}</p>
          <p>
            {[addr.province, addr.city].filter(Boolean).join("، ")}
          </p>
          <p>{String(addr.address || "")}</p>
          {addr.postal_code ? <p>کد پستی: {String(addr.postal_code)}</p> : null}
        </div>
        <div>
          {order.shipping_tracking ? <p>بارکد پستی: {order.shipping_tracking}</p> : null}
          {order.coupon_code ? <p>کوپن: {order.coupon_code}</p> : null}
        </div>
      </div>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-300 text-right">
            <th className="py-2">کالا</th>
            <th className="py-2">SKU</th>
            <th className="py-2">تعداد</th>
            <th className="py-2">قیمت</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.id} className="border-b border-zinc-200">
              <td className="py-2">{i.title_snapshot}</td>
              <td className="py-2 font-mono text-xs">{i.sku_snapshot}</td>
              <td className="py-2">{i.quantity}</td>
              <td className="py-2">{formatToman(i.unit_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-6 ms-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <dt>جمع کالا</dt>
          <dd>{formatToman(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>تخفیف</dt>
          <dd>{formatToman(order.discount_total)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>ارسال</dt>
          <dd>{formatToman(order.shipping_total)}</dd>
        </div>
        <div className="flex justify-between border-t border-zinc-300 pt-2 font-bold">
          <dt>قابل پرداخت</dt>
          <dd>{formatToman(order.total)}</dd>
        </div>
      </dl>
    </div>
  );
}

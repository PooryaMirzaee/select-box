"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ArrowLeft, Loader2 } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { adminFetch, type OrderAdminDetail } from "@/lib/api";
import {
  ORDER_STATUSES,
  orderStatusColor,
  orderStatusLabel,
} from "@/lib/admin-status";
import { cn, formatToman } from "@/lib/utils";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function AddressBlock({ address }: { address: Record<string, unknown> | null }) {
  if (!address) return <p className="text-muted">ثبت نشده</p>;
  const fields: [string, string][] = [
    ["full_name", "نام"],
    ["name", "نام"],
    ["phone", "تلفن"],
    ["mobile", "موبایل"],
    ["province", "استان"],
    ["city", "شهر"],
    ["address", "آدرس"],
    ["postal_code", "کد پستی"],
  ];
  const shown = new Set<string>();
  return (
    <dl className="space-y-2 text-sm">
      {fields.map(([key, label]) => {
        const val = address[key];
        if (!val || shown.has(label)) return null;
        shown.add(label);
        return (
          <div key={key} className="flex gap-2">
            <dt className="w-20 shrink-0 text-muted">{label}</dt>
            <dd>{String(val)}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = Number(params.id);

  const [order, setOrder] = useState<OrderAdminDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const token = () => localStorage.getItem("coralay_admin_token")!;

  const load = useCallback(() => {
    if (!Number.isFinite(orderId)) return;
    setLoading(true);
    setError(null);
    adminFetch<OrderAdminDetail>(`/api/v1/admin/orders/${orderId}`, token())
      .then((o) => {
        setOrder(o);
        setStatus(o.status);
      })
      .catch((e) => {
        setOrder(null);
        setError(e instanceof Error ? e.message : "سفارش یافت نشد");
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveStatus() {
    if (!order || status === order.status) return;
    setSaving(true);
    setMsg(null);
    try {
      await adminFetch(`/api/v1/admin/orders/${order.id}/status`, token(), {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMsg("وضعیت به‌روز شد");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted">
        <Loader2 size={20} />
        در حال بارگذاری...
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <p className="text-red-500">{error ?? "سفارش یافت نشد"}</p>
        <Link href="/admin/orders" className="mt-4 inline-block text-sm text-[var(--accent)]">
          بازگشت
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <Link
        href="/admin/orders"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-[var(--fg)]"
      >
        <ArrowLeft size={16} />
        همه سفارش‌ها
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">سفارش {order.tracking_code}</h1>
          <p className="mt-1 text-sm text-muted">{formatDate(order.created_at)}</p>
        </div>
        <span className={cn("px-3 py-1 text-sm font-medium", orderStatusColor(order.status))}>
          {orderStatusLabel(order.status)}
        </span>
      </div>

      {msg ? <p className="mt-4 text-sm text-green-500">{msg}</p> : null}
      {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}

      <div className="card-theme mt-8 p-5">
        <h2 className="font-medium">تغییر وضعیت</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            <span className="text-muted">وضعیت جدید</span>
            <select
              className="input-theme mt-1 min-w-[200px]"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {orderStatusLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <Button disabled={saving || status === order.status} onClick={saveStatus}>
            {saving ? "..." : "ذخیره وضعیت"}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card-theme p-5">
          <h2 className="font-medium">آدرس ارسال</h2>
          <div className="mt-3">
            <AddressBlock address={order.shipping_address} />
          </div>
        </div>
        <div className="card-theme p-5">
          <h2 className="font-medium">خلاصه مالی</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">جمع جزء</dt>
              <dd>{formatToman(order.subtotal)}</dd>
            </div>
            {Number(order.discount_total) > 0 ? (
              <div className="flex justify-between text-green-600">
                <dt>تخفیف {order.coupon_code ? `(${order.coupon_code})` : ""}</dt>
                <dd>−{formatToman(order.discount_total)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-muted">ارسال</dt>
              <dd>{formatToman(order.shipping_total)}</dd>
            </div>
            <div className="flex justify-between border-t border-theme pt-2 text-base font-semibold">
              <dt>مبلغ نهایی</dt>
              <dd className="text-[var(--accent)]">{formatToman(order.total)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {order.payments.length > 0 ? (
        <div className="card-theme mt-6 p-5">
          <h2 className="font-medium">پرداخت‌ها</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {order.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-surface px-3 py-2">
                <span>
                  {p.gateway} · {p.status}
                  {p.gateway_ref ? (
                    <span className="ms-2 font-mono text-xs text-muted">{p.gateway_ref}</span>
                  ) : null}
                </span>
                <span>{formatToman(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="card-theme mt-6 overflow-x-auto">
        <h2 className="p-5 pb-0 font-medium">اقلام سفارش ({order.items.length})</h2>
        <table className="mt-4 w-full min-w-[640px] text-sm">
          <thead className="border-y border-theme text-muted">
            <tr>
              <th className="p-4 text-right">محصول</th>
              <th className="p-4 text-right">SKU</th>
              <th className="p-4 text-right">تعداد</th>
              <th className="p-4 text-right">قیمت واحد</th>
              <th className="p-4 text-right">جمع</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-theme/60">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {item.preview_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.preview_url} alt="" className="h-12 w-12 border border-theme object-cover" />
                    ) : null}
                    <div>
                      <p>{item.title_snapshot}</p>
                      {item.is_custom ? (
                        <span className="text-[10px] text-[var(--accent)]">سفارشی</span>
                      ) : null}
                      {item.design_id ? (
                        <Link
                          href={`/admin/designs?design=${item.design_id}`}
                          className="mt-1 block text-[10px] text-muted hover:text-[var(--accent)]"
                        >
                          طرح خام #{item.design_id} ←
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="p-4 font-mono text-xs text-muted">{item.sku_snapshot}</td>
                <td className="p-4">{item.quantity}</td>
                <td className="p-4">{formatToman(item.unit_price)}</td>
                <td className="p-4 font-medium">
                  {formatToman(Number(item.unit_price) * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={() => router.push("/admin/orders")}>
          بازگشت
        </Button>
        <Link href={`/orders/${order.tracking_code}`} target="_blank" rel="noreferrer">
          <Button variant="ghost">مشاهده صفحه مشتری</Button>
        </Link>
      </div>
    </div>
  );
}

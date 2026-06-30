"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "@/components/icons";

import { Button } from "@/components/ui/Button";
import { adminFetch, type BusinessQuoteAdmin } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  pending: "جدید",
  reviewing: "در بررسی",
  quoted: "پیش‌فاکتور ارسال شد",
  accepted: "تأیید شده",
  closed: "بسته شده",
};

const PRODUCT_LABELS: Record<string, string> = {
  tshirt: "تیشرت",
  hoodie: "هودی",
  mug: "ماگ",
  mixed: "ترکیبی",
  hub: "صفحه اصلی",
};

export default function AdminBusinessQuotesPage() {
  const [quotes, setQuotes] = useState<BusinessQuoteAdmin[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BusinessQuoteAdmin | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const token = () => localStorage.getItem("coralay_admin_token")!;

  async function load() {
    setLoading(true);
    try {
      const q = filter ? `?status=${filter}` : "";
      const rows = await adminFetch<BusinessQuoteAdmin[]>(`/api/v1/admin/business/quotes${q}`, token());
      setQuotes(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [filter]);

  function openQuote(q: BusinessQuoteAdmin) {
    setSelected(q);
    setNotes(q.admin_notes ?? "");
    setStatus(q.status);
  }

  async function saveQuote() {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await adminFetch<BusinessQuoteAdmin>(
        `/api/v1/admin/business/quotes/${selected.id}`,
        token(),
        { method: "PATCH", body: JSON.stringify({ status, admin_notes: notes }) },
      );
      setQuotes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
      setSelected(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">درخواست‌های سازمانی</h1>
          <p className="mt-1 text-sm text-muted">پیش‌فاکتور و سفارش B2B</p>
        </div>
        <Link href="/admin/business">
          <Button variant="outline" size="sm">
            مدیریت لندینگ‌ها
          </Button>
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {["", "pending", "reviewing", "quoted", "accepted", "closed"].map((s) => (
          <button
            key={s || "all"}
            type="button"
            className={cn("chip-theme !text-xs", filter === s && "is-active")}
            onClick={() => setFilter(s)}
          >
            {s ? STATUS_LABELS[s] : "همه"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-8 flex items-center gap-2 text-muted">
          <Loader2 className="h-5 w-5" />
          بارگذاری...
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="card-theme overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme text-start text-muted">
                  <th className="p-3 font-normal">شرکت</th>
                  <th className="hidden p-3 font-normal sm:table-cell">محصول</th>
                  <th className="p-3 font-normal">تعداد</th>
                  <th className="hidden p-3 font-normal md:table-cell">وضعیت</th>
                  <th className="p-3 font-normal">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr
                    key={q.id}
                    className={cn(
                      "cursor-pointer border-b border-theme transition hover:bg-[var(--bg-elevated)]",
                      selected?.id === q.id && "bg-[var(--accent-soft)]",
                    )}
                    onClick={() => openQuote(q)}
                  >
                    <td className="p-3">
                      <p className="font-medium">{q.company_name}</p>
                      <p className="text-xs text-muted">{q.contact_name}</p>
                    </td>
                    <td className="hidden p-3 sm:table-cell">{PRODUCT_LABELS[q.product_type] ?? q.product_type}</td>
                    <td className="p-3 tabular-nums">{q.quantity.toLocaleString("fa-IR")}</td>
                    <td className="hidden p-3 md:table-cell">
                      <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-xs">
                        {STATUS_LABELS[q.status] ?? q.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-muted">
                      {new Date(q.created_at).toLocaleDateString("fa-IR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!quotes.length ? <p className="p-6 text-center text-sm text-muted">درخواستی یافت نشد.</p> : null}
          </div>

          {selected ? (
            <div className="card-theme space-y-4 p-5">
              <div>
                <p className="font-mono text-xs text-[var(--accent)]">B2B-{String(selected.id).padStart(5, "0")}</p>
                <h2 className="mt-1 text-lg font-semibold">{selected.company_name}</h2>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">مسئول</dt>
                  <dd>{selected.contact_name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">موبایل</dt>
                  <dd dir="ltr">{selected.phone}</dd>
                </div>
                {selected.email ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">ایمیل</dt>
                    <dd dir="ltr" className="truncate">
                      {selected.email}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">محصول</dt>
                  <dd>{PRODUCT_LABELS[selected.product_type] ?? selected.product_type}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">تعداد</dt>
                  <dd>{selected.quantity.toLocaleString("fa-IR")}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">طراحی اختصاصی</dt>
                  <dd>{selected.needs_custom_design ? "بله" : "خیر"}</dd>
                </div>
              </dl>
              {selected.message ? (
                <div className="rounded-xl bg-[var(--bg-elevated)] p-3 text-sm">{selected.message}</div>
              ) : null}

              <label className="block text-sm">
                <span className="text-muted">وضعیت</span>
                <select className="input-theme mt-1" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-muted">یادداشت داخلی</span>
                <textarea className="input-theme mt-1 min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
              <Button type="button" className="w-full" disabled={saving} onClick={() => void saveQuote()}>
                {saving ? "ذخیره..." : "ذخیره"}
              </Button>
            </div>
          ) : (
            <div className="card-theme flex items-center justify-center p-8 text-sm text-muted">
              یک درخواست را انتخاب کنید
            </div>
          )}
        </div>
      )}
    </div>
  );
}

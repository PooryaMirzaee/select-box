"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  initiateCardTransfer,
  uploadPaymentReceipt,
  type CardTransferInit,
} from "@/lib/api";
import { formatToman } from "@/lib/utils";

function formatCardNumber(num: string) {
  const digits = num.replace(/\D/g, "");
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function CardTransferInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const orderId = Number(sp.get("order_id"));
  const paymentIdParam = sp.get("payment_id");

  const [info, setInfo] = useState<CardTransferInit | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setError("سفارش نامعتبر است");
      return;
    }
    initiateCardTransfer(orderId)
      .then((data) => {
        setInfo(data);
        if (data.receipt_uploaded) setDone(true);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "خطا"))
      .finally(() => setLoading(false));
  }, [orderId]);

  async function copyCard() {
    if (!info?.card_number) return;
    try {
      await navigator.clipboard.writeText(info.card_number.replace(/\D/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("کپی نشد — شماره را دستی کپی کنید");
    }
  }

  async function submitReceipt() {
    if (!info || !file) {
      alert("لطفاً تصویر یا فایل رسید را انتخاب کنید");
      return;
    }
    const paymentId = paymentIdParam ? Number(paymentIdParam) : info.payment_id;
    setUploading(true);
    setError(null);
    try {
      await uploadPaymentReceipt(paymentId, file, note);
      router.replace(`/orders/${info.tracking_code}?pending_card=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در آپلود");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <p className="p-16 text-center text-muted">در حال بارگذاری...</p>;
  }

  if (error && !info) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-red-500">{error}</p>
        <Link href="/checkout" className="mt-6 inline-block text-sm text-[var(--accent)]">
          بازگشت به تسویه حساب
        </Link>
      </div>
    );
  }

  if (!info) return null;

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="card-theme p-8">
          <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">
            رسید ثبت شد
          </h1>
          <p className="mt-4 text-sm text-muted">
            پس از بررسی و تأیید توسط فروشگاه، سفارش شما پردازش می‌شود.
          </p>
          <p className="mt-2 text-sm">
            کد رهگیری:{" "}
            <span className="font-mono text-[var(--accent)]">{info.tracking_code}</span>
          </p>
          <Link href={`/orders/${info.tracking_code}?pending_card=1`} className="mt-8 inline-block">
            <Button className="w-full">مشاهده وضعیت سفارش</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 lg:py-14">
      <h1 className="text-2xl font-semibold">پرداخت کارت‌به‌کارت</h1>
      <p className="mt-2 text-sm text-muted">
        مبلغ را به شماره کارت زیر واریز کنید و رسید را آپلود نمایید.
      </p>

      <div className="card-theme mt-8 space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted">مبلغ قابل پرداخت</p>
            <p className="text-xl font-semibold text-[var(--accent)]">
              {formatToman(info.amount)}
            </p>
          </div>
          <div className="text-left text-sm">
            <p className="text-muted">کد رهگیری</p>
            <p className="font-mono">{info.tracking_code}</p>
          </div>
        </div>

        <div className="rounded-xl border border-theme bg-[var(--bg)] p-4">
          {info.card_bank_name ? (
            <p className="text-sm text-muted">{info.card_bank_name}</p>
          ) : null}
          {info.card_holder ? (
            <p className="mt-1 text-sm">به نام: {info.card_holder}</p>
          ) : null}
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="font-mono text-lg tracking-wider" dir="ltr">
              {formatCardNumber(info.card_number)}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={copyCard}>
              {copied ? "کپی شد" : "کپی"}
            </Button>
          </div>
        </div>

        {info.instructions ? (
          <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            {info.instructions}
          </p>
        ) : null}
      </div>

      <div className="card-theme mt-6 space-y-4 p-6">
        <h2 className="font-medium">آپلود رسید</h2>
        <p className="text-xs text-muted">فرمت مجاز: JPG، PNG، WebP یا PDF — حداکثر ۸ مگابایت</p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
          className="block w-full text-sm"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <textarea
          placeholder="توضیحات (اختیاری) — مثلاً ۴ رقم آخر کارت مبدأ"
          rows={2}
          className="w-full rounded-xl border border-theme bg-[var(--bg)] px-4 py-3 text-sm"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <Button
          className="w-full"
          size="lg"
          disabled={uploading || !file}
          onClick={submitReceipt}
        >
          {uploading ? "در حال ارسال..." : "ثبت رسید"}
        </Button>
      </div>
    </div>
  );
}

export default function CardTransferPage() {
  return (
    <Suspense fallback={<p className="p-16 text-center">...</p>}>
      <CardTransferInner />
    </Suspense>
  );
}

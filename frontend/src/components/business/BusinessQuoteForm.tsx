"use client";

import { useState } from "react";
import { Check, Loader2 } from "@/components/icons";

import { Button } from "@/components/ui/Button";
import { submitBusinessQuote } from "@/lib/api";
import { cn } from "@/lib/utils";

const PRODUCT_OPTIONS = [
  { value: "tshirt", label: "تیشرت" },
  { value: "hoodie", label: "هودی" },
  { value: "mug", label: "ماگ" },
  { value: "mixed", label: "ترکیبی / چند محصول" },
];

type Props = {
  defaultProductType?: string;
  landingSlug?: string;
  minOrderQty?: number;
  className?: string;
  compact?: boolean;
};

export function BusinessQuoteForm({
  defaultProductType = "mixed",
  landingSlug,
  minOrderQty = 10,
  className,
  compact = false,
}: Props) {
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [productType, setProductType] = useState(defaultProductType);
  const [quantity, setQuantity] = useState(minOrderQty);
  const [customDesign, setCustomDesign] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ ref: string; msg: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await submitBusinessQuote({
        company_name: company,
        contact_name: contact,
        phone,
        email: email || undefined,
        product_type: productType,
        quantity,
        needs_custom_design: customDesign,
        message: message || undefined,
        landing_slug: landingSlug,
      });
      setSuccess({ ref: res.tracking_ref, msg: res.message });
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ثبت درخواست");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className={cn("card-theme p-6 text-center sm:p-8", className)}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
          <Check className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">درخواست ثبت شد</h3>
        <p className="mt-2 text-sm text-muted">{success.msg}</p>
        <p className="mt-4 rounded-xl bg-[var(--bg-elevated)] px-4 py-3 font-mono text-sm tracking-wide">
          {success.ref}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6 w-full"
          onClick={() => {
            setSuccess(null);
            setCompany("");
            setContact("");
            setPhone("");
            setEmail("");
            setMessage("");
          }}
        >
          درخواست جدید
        </Button>
      </div>
    );
  }

  return (
    <form
      id="quote-form"
      onSubmit={handleSubmit}
      className={cn("card-theme sticky top-24 p-5 sm:p-6", className)}
    >
      <h3 className={cn("font-semibold", compact ? "text-base" : "text-lg")}>درخواست پیش‌فاکتور</h3>
      <p className="mt-1 text-xs text-muted">ظرف ۲۴ ساعت با شما تماس می‌گیریم.</p>

      <div className="mt-5 space-y-3">
        <input
          className="input-theme text-sm"
          placeholder="نام شرکت / سازمان *"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
          minLength={2}
        />
        <input
          className="input-theme text-sm"
          placeholder="نام مسئول *"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          required
          minLength={2}
        />
        <input
          placeholder="موبایل *"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          dir="ltr"
          className="input-theme text-end text-sm"
        />
        <input
          placeholder="ایمیل (اختیاری)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          dir="ltr"
          className="input-theme text-end text-sm"
        />

        <div>
          <label className="mb-1.5 block text-xs text-muted">نوع محصول</label>
          <div className="flex flex-wrap gap-2">
            {PRODUCT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={cn("chip-theme !min-h-[36px] !px-3 !text-xs", productType === opt.value && "is-active")}
                onClick={() => setProductType(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="biz-form-qty" className="mb-1.5 block text-xs text-muted">
            تعداد تقریبی
          </label>
          <input
            id="biz-form-qty"
            type="number"
            min={minOrderQty}
            className="input-theme text-sm"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(minOrderQty, Number(e.target.value) || minOrderQty))}
            required
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={customDesign}
            onChange={(e) => setCustomDesign(e.target.checked)}
            className="h-4 w-4 rounded border-theme accent-[var(--accent)]"
          />
          <span>نیاز به طراحی / چاپ لوگو دارم</span>
        </label>

        <textarea
          className="input-theme min-h-[80px] resize-y text-sm"
          placeholder="توضیحات (سایز، رنگ، زمان تحویل...)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
        />
      </div>

      {error ? <p className="mt-3 text-xs text-red-500">{error}</p> : null}

      <Button type="submit" className="mt-5 w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="me-2 h-4 w-4" />
            در حال ارسال...
          </>
        ) : (
          "ارسال درخواست"
        )}
      </Button>
    </form>
  );
}

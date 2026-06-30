"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { requestOtp, verifyOtp } from "@/lib/auth";

type Props = {
  onSuccess?: () => void;
  compact?: boolean;
};

export function OtpLoginForm({ onSuccess, compact }: Props) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setMsg(null);
    setLoading(true);
    try {
      const res = await requestOtp(phone);
      setMsg(res.detail);
      setStep("code");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "خطا در ارسال کد");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setMsg(null);
    setLoading(true);
    try {
      await verifyOtp(phone, code);
      setMsg("ورود موفق");
      onSuccess?.();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "کد نامعتبر");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <input
        placeholder="شماره موبایل (۰۹…)"
        className="w-full rounded-xl border border-theme bg-[var(--input-bg)] px-4 py-3 text-sm"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={step === "code"}
      />
      {step === "code" ? (
        <>
          <input
            placeholder="کد تأیید"
            className="w-full rounded-xl border border-theme bg-[var(--input-bg)] px-4 py-3 text-sm"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
          />
          <button
            type="button"
            className="text-xs text-muted underline"
            onClick={() => {
              setStep("phone");
              setCode("");
            }}
          >
            تغییر شماره
          </button>
        </>
      ) : null}
      {step === "phone" ? (
        <Button className="w-full" disabled={loading || phone.length < 10} onClick={() => void sendCode()}>
          {loading ? "در حال ارسال…" : "دریافت کد"}
        </Button>
      ) : (
        <Button className="w-full" disabled={loading || code.length < 4} onClick={() => void verify()}>
          {loading ? "در حال ورود…" : "ورود"}
        </Button>
      )}
      {msg ? (
        <p className={`text-sm ${msg.includes("موفق") ? "text-green-600" : "text-[var(--accent)]"}`}>{msg}</p>
      ) : null}
    </div>
  );
}

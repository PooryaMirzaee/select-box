"use client";

import { X } from "@/components/icons";

import { OtpLoginForm } from "@/components/auth/OtpLoginForm";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
};

export function LoginModal({ open, onClose, onSuccess, title = "ورود با موبایل" }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border-2 border-[var(--fg)] bg-[var(--bg-elevated)] p-6 shadow-[6px_6px_0_0_var(--fg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" className="rounded-lg p-1 text-muted hover:bg-[var(--input-bg)]" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">برای سفارش، پیگیری و مدیریت استودیو</p>
        <div className="mt-4">
          <OtpLoginForm
            compact
            onSuccess={() => {
              onSuccess?.();
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}

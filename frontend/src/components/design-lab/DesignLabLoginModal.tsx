"use client";

import { OtpLoginForm } from "@/components/auth/OtpLoginForm";
import { Button } from "@/components/ui/Button";

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export function DesignLabLoginModal({ onClose, onSuccess }: Props) {
  return (
    <div className="design-lab-modal-backdrop">
      <div className="design-lab-modal">
        <h2>ورود با موبایل</h2>
        <p className="mt-1 text-sm text-muted">
          برای سفارش یا ثبت در ویترین لازم است. ساخت اثر بدون ورود آزاد است.
        </p>
        <div className="mt-4">
          <OtpLoginForm
            compact
            onSuccess={() => {
              onSuccess();
              onClose();
            }}
          />
        </div>
        <Button variant="outline" className="mt-3 w-full" onClick={onClose}>
          بعداً
        </Button>
      </div>
    </div>
  );
}

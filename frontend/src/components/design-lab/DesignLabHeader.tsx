"use client";

import Link from "next/link";
import { ArrowLeft, Home, Loader2, Save, User } from "@/components/icons";

type Props = {
  productName: string;
  onChangeProduct?: () => void;
  onSave?: () => void;
  saving?: boolean;
};

export function DesignLabHeader({ productName, onChangeProduct, onSave, saving }: Props) {
  return (
    <header className="design-lab-topbar">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/customize" className="design-lab-back" title="بازگشت">
          <ArrowLeft size={18} />
        </Link>
        <Link href="/" className="design-lab-back" title="فروشگاه">
          <Home size={18} />
        </Link>
        <span className="design-lab-brand truncate">
          <span className="hidden sm:inline">آزمایشگاه طراحی</span>
          <span className="mx-2 text-muted hidden sm:inline">·</span>
          <span className="font-normal text-muted">{productName}</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        {onChangeProduct ? (
          <button
            type="button"
            className="hidden text-sm text-[var(--dl-orange)] hover:underline sm:inline"
            onClick={onChangeProduct}
          >
            تغییر محصول
          </button>
        ) : null}
        {onSave ? (
          <button
            type="button"
            className="design-lab-header-save md:hidden"
            onClick={onSave}
            aria-label="ذخیره"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          </button>
        ) : null}
        <Link href="/account" className="design-lab-back flex items-center gap-1 text-sm">
          <User size={16} />
          <span className="hidden sm:inline">حساب</span>
        </Link>
      </div>
    </header>
  );
}

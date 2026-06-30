"use client";

import { AlignCenter, Copy, FlipHorizontal2, ImagePlus, Loader2, Trash2 } from "@/components/icons";

type Props = {
  selection: "image" | "text" | null;
  bgRemoving: boolean;
  onRemoveBg: () => void;
  onDuplicate: () => void;
  onCenter: () => void;
  onFlip: () => void;
  onDelete: () => void;
};

/**
 * نوار ابزار شناور لایهٔ انتخاب‌شده — فقط موبایل.
 * وقتی شیئی انتخاب است و sheet بسته، اکشن‌های لایه را در دسترس می‌گذارد.
 */
export function DesignLabMobileContextBar({
  selection,
  bgRemoving,
  onRemoveBg,
  onDuplicate,
  onCenter,
  onFlip,
  onDelete,
}: Props) {
  if (!selection) return null;

  return (
    <div className="design-lab-mobile-context md:hidden" role="toolbar" aria-label="ابزار لایه">
      {selection === "image" ? (
        <button type="button" disabled={bgRemoving} onClick={onRemoveBg}>
          {bgRemoving ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          <span>حذف پس‌زمینه</span>
        </button>
      ) : null}
      <button type="button" onClick={onDuplicate}>
        <Copy size={18} />
        <span>کپی</span>
      </button>
      <button type="button" onClick={onCenter}>
        <AlignCenter size={18} />
        <span>وسط</span>
      </button>
      <button type="button" onClick={onFlip}>
        <FlipHorizontal2 size={18} />
        <span>آینه</span>
      </button>
      <button type="button" onClick={onDelete}>
        <Trash2 size={18} />
        <span>حذف</span>
      </button>
    </div>
  );
}

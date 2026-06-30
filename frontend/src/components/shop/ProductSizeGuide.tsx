"use client";

import { useEffect, useRef } from "react";

import type { SizeGuideData } from "@/lib/size-guide";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

type Props = {
  guide: SizeGuideData;
  open: boolean;
  onClose: () => void;
};

export function ProductSizeGuideModal({ guide, open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const imageUrl = guide.image_url ?? (guide.image_key ? mediaUrl(guide.image_key) : null);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 z-50 m-auto w-[min(100%,32rem)] max-h-[90vh] overflow-y-auto rounded-2xl border border-theme bg-[var(--bg)] p-0 text-[var(--fg)] shadow-xl backdrop:bg-black/50 open:flex open:flex-col"
    >
      <div className="sticky top-0 flex items-center justify-between border-b border-theme bg-[var(--bg)] px-5 py-4">
        <h2 className="text-lg font-semibold">{guide.title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-theme text-lg"
          aria-label="بستن"
        >
          ×
        </button>
      </div>

      <div className="space-y-5 px-5 py-4">
        {guide.intro ? (
          <p className="text-sm leading-relaxed text-muted">{guide.intro}</p>
        ) : null}

        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={guide.title}
            className="mx-auto max-h-72 w-full rounded-xl object-contain"
          />
        ) : null}

        {guide.rows.length > 0 && guide.columns.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-theme">
            <table className="w-full min-w-[280px] text-sm">
              <thead>
                <tr className="border-b border-theme bg-surface/50">
                  {guide.columns.map((col, i) => (
                    <th key={i} className="px-3 py-2 text-right font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guide.rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className={cn("border-b border-theme last:border-0", ri % 2 === 1 && "bg-surface/30")}
                  >
                    {guide.columns.map((_, ci) => (
                      <td key={ci} className="px-3 py-2 text-muted">
                        {row[ci] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {guide.notes.length > 0 ? (
          <ul className="space-y-1 text-xs text-muted">
            {guide.notes.filter(Boolean).map((note, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden>•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </dialog>
  );
}

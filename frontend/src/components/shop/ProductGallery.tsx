"use client";

import { useState } from "react";

import { mediaUrls } from "@/lib/media";
import { cn } from "@/lib/utils";

type Props = {
  images: string[];
  title: string;
};

export function ProductGallery({ images, title }: Props) {
  const [active, setActive] = useState(0);
  const urls = mediaUrls(images);

  if (!urls.length) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center rounded-2xl border border-dashed border-theme bg-[var(--bg-elevated)] px-6 text-center text-sm text-muted">
        بدون تصویر — از پنل ادمین عکس محصول آپلود کنید
      </div>
    );
  }

  const main = urls[active] ?? urls[0];

  return (
    <div className="space-y-3">
      <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-theme bg-white dark:bg-[var(--bg-elevated)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={main}
          alt={title}
          decoding="async"
          className="product-img h-full w-full object-contain p-3 sm:p-5"
        />
      </div>
      {urls.length > 1 ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {urls.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`تصویر ${(i + 1).toLocaleString("fa-IR")}`}
              aria-pressed={i === active}
              className={cn(
                "h-16 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition dark:bg-[var(--bg-elevated)]",
                i === active ? "border-[var(--accent)]" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                loading="lazy"
                decoding="async"
                className="product-img h-full w-full object-contain p-0.5"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

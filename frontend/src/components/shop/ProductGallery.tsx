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
      <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-theme bg-[var(--bg-elevated)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={main} alt={title} className="h-full w-full object-cover" />
      </div>
      {urls.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {urls.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "h-16 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition",
                i === active ? "border-[var(--accent)]" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

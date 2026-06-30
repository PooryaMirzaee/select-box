"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "@/components/icons";
import { motion, AnimatePresence } from "framer-motion";

import type { BusinessGalleryItem } from "@/lib/api";

export type GallerySample = {
  image_url: string;
  caption_fa: string;
};

type Props = {
  title?: string | null;
  items: BusinessGalleryItem[];
  samples?: GallerySample[];
};

function mergedItems(items: BusinessGalleryItem[], samples: GallerySample[]): BusinessGalleryItem[] {
  const uploaded = items.filter((i) => i.image_url);
  if (uploaded.length) return uploaded;
  return samples.map((s, i) => ({
    id: `sample-${i}`,
    caption_fa: s.caption_fa,
    sort_order: i,
    image_url: s.image_url,
  }));
}

export function BusinessGallery({ title, items, samples = [] }: Props) {
  const gallery = mergedItems(items, samples);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const close = useCallback(() => setLightbox(null), []);
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, close]);

  if (!gallery.length) return null;

  const featured = gallery[0];
  const rest = gallery.slice(1);

  return (
    <section id="gallery" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">{title ?? "گالری نمونه کار"}</h2>
          <p className="mt-1 text-sm text-muted">نمونه‌های واقعی از پروژه‌های سازمانی</p>
        </div>
        {items.length === 0 && samples.length > 0 ? (
          <span className="rounded-full border border-theme px-3 py-1 text-[10px] text-muted">از کاتالوگ</span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-4 sm:grid-rows-2 sm:gap-4">
        <button
          type="button"
          onClick={() => setLightbox(0)}
          className="group relative col-span-2 row-span-2 overflow-hidden rounded-2xl border border-theme bg-[var(--bg-elevated)] sm:min-h-[320px]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={featured.image_url!}
            alt={featured.caption_fa ?? ""}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--fg)]/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
          {featured.caption_fa ? (
            <p className="absolute bottom-0 start-0 end-0 p-4 text-start text-sm font-medium text-white opacity-0 transition group-hover:opacity-100">
              {featured.caption_fa}
            </p>
          ) : null}
        </button>

        {rest.slice(0, 4).map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setLightbox(i + 1)}
            className="group relative overflow-hidden rounded-2xl border border-theme bg-[var(--bg-elevated)] sm:min-h-[150px]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image_url!}
              alt={item.caption_fa ?? ""}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
            />
          </button>
        ))}
      </div>

      {gallery.length > 5 ? (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {gallery.slice(5).map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLightbox(i + 5)}
              className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-theme"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image_url!} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      <AnimatePresence>
        {lightbox !== null && gallery[lightbox] ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--fg)]/80 p-4 backdrop-blur-sm"
            onClick={close}
          >
            <button
              type="button"
              className="absolute end-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--card)] text-[var(--fg)]"
              onClick={close}
              aria-label="بستن"
            >
              <X className="h-5 w-5" />
            </button>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-h-[85vh] max-w-4xl overflow-hidden rounded-2xl border border-theme bg-[var(--card)] shadow-[var(--shadow-soft)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gallery[lightbox].image_url!}
                alt={gallery[lightbox].caption_fa ?? ""}
                className="max-h-[75vh] w-full object-contain"
              />
              {gallery[lightbox].caption_fa ? (
                <p className="border-t border-theme px-4 py-3 text-sm text-muted">{gallery[lightbox].caption_fa}</p>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

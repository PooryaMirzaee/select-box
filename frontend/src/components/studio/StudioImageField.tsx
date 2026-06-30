"use client";

import { ImagePlus, Loader2, Trash2 } from "@/components/icons";
import { useRef, useState } from "react";

import { mediaUrl } from "@/lib/media";

type Props = {
  label: string;
  hint: string;
  imageUrl: string | null;
  aspect: "banner" | "square";
  uploading: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
};

export function StudioImageField({
  label,
  hint,
  imageUrl,
  aspect,
  uploading,
  onUpload,
  onRemove,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const src = mediaUrl(imageUrl) ?? imageUrl;

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLocalErr("فقط تصویر مجاز است");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setLocalErr("حداکثر ۴ مگابایت");
      return;
    }
    setLocalErr(null);
    try {
      await onUpload(file);
    } catch (err) {
      setLocalErr(err instanceof Error ? err.message : "خطا در آپلود");
    }
  }

  return (
    <div>
      <label className="block text-xs font-semibold uppercase text-muted">{label}</label>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => void onChange(e)}
      />
      <div
        className={`mt-2 relative overflow-hidden rounded-xl border-2 border-dashed border-theme bg-[var(--input-bg)] ${
          aspect === "banner" ? "aspect-[3/1] min-h-[88px]" : "aspect-square max-w-[120px]"
        }`}
      >
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted">
            <ImagePlus className="h-6 w-6 opacity-50" />
            <span className="text-[10px]">بدون تصویر</span>
          </div>
        )}
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-theme px-3 py-1.5 text-xs font-medium hover:bg-[var(--bg-elevated)]"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {src ? "تغییر تصویر" : "انتخاب تصویر"}
        </button>
        {src ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10"
            disabled={uploading}
            onClick={() => void onRemove().catch((e) => setLocalErr(e instanceof Error ? e.message : "خطا"))}
          >
            <Trash2 className="h-3.5 w-3.5" />
            حذف
          </button>
        ) : null}
      </div>
      {localErr ? <p className="mt-1 text-xs text-red-500">{localErr}</p> : null}
    </div>
  );
}

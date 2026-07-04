"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { adminFetch } from "@/lib/api";
import { apiUrl } from "@/lib/api-base";
import { mediaUrl } from "@/lib/media";

export type ProductImageAdmin = {
  id: number;
  product_id: number;
  storage_key: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
};

type Props = {
  productId: number;
  onCountChange?: (count: number) => void;
};

export function ProductImagesSection({ productId, onCountChange }: Props) {
  const [images, setImages] = useState<ProductImageAdmin[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  const token = () => localStorage.getItem("selectbox_admin_token")!;

  const load = useCallback(() => {
    adminFetch<ProductImageAdmin[]>(`/api/v1/admin/products/${productId}/images`, token())
      .then((rows) => {
        setImages(rows);
        onCountChange?.(rows.length);
      })
      .catch(() => {
        setImages([]);
        onCountChange?.(0);
      });
  }, [productId, onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!files?.length) return;
    setUploading(true);
    let failed = false;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(apiUrl(`/api/v1/admin/products/${productId}/images`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      if (!res.ok) {
        failed = true;
        alert(await res.text());
        break;
      }
    }
    setUploading(false);
    setFiles(null);
    if (!failed) load();
  }

  async function remove(imageId: number) {
    if (!confirm("حذف این تصویر؟")) return;
    await adminFetch(`/api/v1/admin/products/${productId}/images/${imageId}`, token(), {
      method: "DELETE",
    });
    load();
  }

  return (
    <section className="mt-10 rounded-2xl border border-theme p-6">
      <h2 className="text-lg font-medium">گالری تصاویر</h2>
      <p className="mt-1 text-sm text-muted">
        چند عکس آپلود کنید — اولین تصویر = تصویر اصلی در فروشگاه
      </p>

      {images.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <div key={img.id} className="rounded-xl border border-theme p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(img.url)}
                alt={img.alt_text ?? ""}
                className="aspect-[4/5] w-full rounded-lg object-cover"
              />
              <p className="mt-1 text-[10px] text-muted">
                {i === 0 ? "اصلی" : `#${i + 1}`}
              </p>
              <button
                type="button"
                className="mt-1 text-xs text-red-400"
                onClick={() => remove(img.id)}
              >
                حذف
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">هنوز تصویری نیست</p>
      )}

      <form onSubmit={upload} className="mt-6 border-t border-theme pt-6">
        <label className="block text-sm">
          <span className="text-muted">انتخاب یک یا چند تصویر</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="mt-2 block w-full text-sm"
            onChange={(e) => setFiles(e.target.files)}
          />
        </label>
        <Button type="submit" className="mt-3" size="sm" disabled={uploading || !files?.length}>
          {uploading ? "در حال آپلود..." : "آپلود به گالری"}
        </Button>
      </form>
    </section>
  );
}

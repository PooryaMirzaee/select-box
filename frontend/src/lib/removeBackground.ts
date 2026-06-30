/**
 * حذف پس‌زمینه — rembg روی سرور (U²-Net / ISNet، رایگان و بدون API خارجی).
 */

type BgSource = Blob | File;

const API_URL =
  typeof window === "undefined"
    ? (process.env.API_URL ?? "http://localhost:8000")
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");

const MAX_BYTES = 8 * 1024 * 1024;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("خواندن تصویر ناموفق بود"));
    reader.readAsDataURL(blob);
  });
}

/** سازگاری با کد قبلی — مدل دیگر در مرورگر preload نمی‌شود */
export function preloadBackgroundRemoval(): Promise<void> {
  return Promise.resolve();
}

export async function removeImageBackground(source: BgSource): Promise<Blob> {
  if (source.size > MAX_BYTES) {
    throw new Error("حجم فایل بیش از ۸ مگابایت است");
  }

  const form = new FormData();
  form.append("file", source, source instanceof File ? source.name : "image.png");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch(`${API_URL}/api/v1/customizer/remove-background`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) {
      let detail = "خطا در حذف پس‌زمینه";
      try {
        const err = (await res.json()) as { detail?: string };
        detail = err.detail ?? detail;
      } catch {
        detail = res.statusText || detail;
      }
      throw new Error(detail);
    }
    return res.blob();
  } finally {
    clearTimeout(timeout);
  }
}

export async function removeImageBackgroundToDataUrl(source: BgSource): Promise<string> {
  const blob = await removeImageBackground(source);
  return blobToDataUrl(blob);
}

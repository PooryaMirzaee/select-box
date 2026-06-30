import { encodeMediaPath, mediaUrl } from "@/lib/media";

/** آدرس امن برای Fabric/canvas — API را به پروکسی same-origin تبدیل می‌کند */
export function normalizeCanvasImageSrc(src: string): string {
  if (!src) return src;
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  if (src.startsWith("/mockups/")) return src;
  return encodeMediaPath(mediaUrl(src) || src);
}

export function loadCorsSafeImage(src: string): Promise<HTMLImageElement> {
  const url = normalizeCanvasImageSrc(src);
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image load failed: ${url}`));
    img.src = url;
  });
}

export function needsCanvasSrcRefresh(src: string | null | undefined): boolean {
  if (!src) return false;
  if (src.startsWith("data:") || src.startsWith("blob:")) return false;
  if (src.startsWith("/api/media/") || src.startsWith("/mockups/")) return false;
  return true;
}

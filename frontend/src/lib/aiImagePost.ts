/**
 * پس‌پردازش تصویر AI — حذف مجنتا و شطرنجی شفافیت جعلی
 */

const CHROMA_TOLERANCE = 48;
const CHECKER_MAX_DELTA = 12;
const CHECKER_MIN_BRIGHTNESS = 200;

function isChromaMagenta(r: number, g: number, b: number): boolean {
  return Math.abs(r - 255) <= CHROMA_TOLERANCE && g <= CHROMA_TOLERANCE && Math.abs(b - 255) <= CHROMA_TOLERANCE;
}

function isFakeCheckerboard(r: number, g: number, b: number): boolean {
  if (Math.max(r, g, b) - Math.min(r, g, b) > CHECKER_MAX_DELTA) return false;
  return (r + g + b) / 3 >= CHECKER_MIN_BRIGHTNESS;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("بارگذاری تصویر ناموفق بود"));
    img.src = url;
  });
}

function cropToContent(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;

  const pad = 4;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const width = Math.min(w, maxX - minX + 1 + pad * 2);
  const height = Math.min(h, maxY - minY + 1 + pad * 2);
  return { left, top, width, height };
}

/** URL تصویر AI را به PNG شفاف تبدیل می‌کند */
export async function prepareAiArtwork(imageUrl: string): Promise<string> {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    if (isChromaMagenta(r, g, b) || isFakeCheckerboard(r, g, b)) {
      d[i + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  const crop = cropToContent(ctx, canvas.width, canvas.height);
  if (!crop) return canvas.toDataURL("image/png");

  const out = document.createElement("canvas");
  out.width = crop.width;
  out.height = crop.height;
  const outCtx = out.getContext("2d");
  if (!outCtx) return canvas.toDataURL("image/png");
  outCtx.drawImage(canvas, crop.left, crop.top, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return out.toDataURL("image/png");
}

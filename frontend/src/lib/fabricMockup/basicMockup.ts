const PHOTO = "/mockups/basic/tshirt-photo.jpg";
const PHOTO_BLACK = "/mockups/basic/tshirt-photo-black.jpg";
const MASK = "/mockups/basic/tshirt-mask.png";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function isNearWhite(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length !== 6) return true;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return r > 225 && g > 225 && b > 225;
}

export function isDarkColor(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 < 128;
}

/** mockup واقعی — سفید از عکس، مشکی از نسخه ازپیش‌ساخته یا tint */
export async function buildTshirtBackground(colorHex: string, size: number): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  if (isDarkColor(colorHex)) {
    try {
      const black = await loadImage(PHOTO_BLACK);
      ctx.drawImage(black, 0, 0, size, size);
      return canvas;
    } catch {
      /* fallback to tint */
    }
  }

  if (isNearWhite(colorHex)) {
    const photo = await loadImage(PHOTO);
    ctx.drawImage(photo, 0, 0, size, size);
    return canvas;
  }

  const [photo, mask] = await Promise.all([loadImage(PHOTO), loadImage(MASK)]);
  ctx.drawImage(photo, 0, 0, size, size);

  const tint = document.createElement("canvas");
  tint.width = size;
  tint.height = size;
  const tctx = tint.getContext("2d")!;
  tctx.fillStyle = colorHex;
  tctx.fillRect(0, 0, size, size);
  tctx.globalCompositeOperation = "destination-in";
  tctx.drawImage(mask, 0, 0, size, size);

  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.72;
  ctx.drawImage(tint, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  return canvas;
}

/** blend طبیعی چاپ روی پارچه — روی Fabric */
export function applyFabricPrintBlend(
  img: { globalCompositeOperation?: string; opacity?: number },
  colorHex: string,
) {
  if (isDarkColor(colorHex)) {
    img.globalCompositeOperation = "source-over";
    img.opacity = 0.93;
  } else {
    img.globalCompositeOperation = "multiply";
    img.opacity = 0.88;
  }
}

/** ترکیب لایهٔ طرح روی mockup در export — multiply روی پارچه روشن */
export function drawDesignLayerWithPrintBlend(
  ctx: CanvasRenderingContext2D,
  designLayer: CanvasImageSource,
  colorHex: string,
  width: number,
  height: number,
) {
  if (isDarkColor(colorHex)) {
    ctx.globalAlpha = 0.93;
    ctx.drawImage(designLayer, 0, 0, width, height);
    ctx.globalAlpha = 1;
    return;
  }
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.88;
  ctx.drawImage(designLayer, 0, 0, width, height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

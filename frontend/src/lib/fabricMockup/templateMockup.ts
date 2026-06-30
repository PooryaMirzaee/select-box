import { loadCorsSafeImage, normalizeCanvasImageSrc } from "@/lib/corsImage";
import { mediaUrl } from "@/lib/media";
import type { ProductTemplate } from "@/lib/customizer";

import {
  applyFabricPrintBlend,
  buildTshirtBackground,
  drawDesignLayerWithPrintBlend,
  isDarkColor,
} from "./basicMockup";

export type MockupView = string;

export type TemplateColor = {
  name: string;
  hex: string;
  views?: Partial<Record<MockupView, string>>;
};

export type TemplateFont = {
  name: string;
  family: string;
  url?: string;
};

type Config = ProductTemplate["config_json"] & {
  colors?: TemplateColor[];
  fonts?: TemplateFont[];
  mockup?: {
    views?: Partial<Record<MockupView, string>>;
    layers?: { base?: string; mask?: string };
  };
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return loadCorsSafeImage(normalizeCanvasImageSrc(src));
}

function resolvePath(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return mediaUrl(path) || path;
  }
  if (path.startsWith("/mockups/")) return path;
  if (path.startsWith("/api/media/")) return path;
  return mediaUrl(path) || path;
}

function findTemplateColor(config: Config, colorHex: string): TemplateColor | undefined {
  return config.colors?.find((c) => c.hex.toLowerCase() === colorHex.toLowerCase());
}

/**
 * mockup برای رنگ و نما:
 * 1) colors[].views[view] — آپلود اختصاصی آن رنگ در ادمین
 * 2) mockup.views[view] — mockup پیش‌فرض آن نما
 */
export function resolveMockupImageUrl(
  config: Config,
  colorHex: string,
  view: MockupView,
): string | null {
  const fromColor = findTemplateColor(config, colorHex)?.views?.[view];
  if (fromColor) return resolvePath(fromColor);

  const fromSide = config.mockup?.views?.[view];
  if (fromSide) return resolvePath(fromSide);

  if (view === "front" && config.mockup?.layers?.base) {
    return resolvePath(config.mockup.layers.base);
  }

  return null;
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  bg = "#e8e8e8",
) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  const scale = Math.min(width / img.width, height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (width - w) / 2;
  const y = (height - h) / 2;
  ctx.drawImage(img, x, y, w, h);
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  bg = "#e8e8e8",
) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  const scale = Math.max(width / img.width, height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (width - w) / 2;
  const y = (height - h) / 2;
  ctx.drawImage(img, x, y, w, h);
}

export async function buildTemplateBackground(
  config: Config,
  productType: string,
  colorHex: string,
  view: MockupView,
  width: number,
  height: number = width,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const url = resolveMockupImageUrl(config, colorHex, view);
  if (url) {
    const img = await loadImage(url);
    if (productType === "mug") {
      drawImageContain(ctx, img, width, height);
    } else {
      drawImageCover(ctx, img, width, height);
    }
    return canvas;
  }

  if (productType === "mug") {
    const mugUrl = config.mockup?.layers?.base ?? "/mockups/mug/base.jpg";
    const img = await loadImage(resolvePath(mugUrl));
    drawImageContain(ctx, img, width, height);
    return canvas;
  }

  return buildTshirtBackground(colorHex, Math.min(width, height));
}

export {
  applyFabricPrintBlend,
  buildTshirtBackground,
  drawDesignLayerWithPrintBlend,
  isDarkColor,
};

import type { ProductTemplate } from "@/lib/customizer";

import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./designLabCanvas";

/** محدوده چاپ — نسبت به ابعاد Design Lab (۰ تا ۱) */
export type PrintAreaNorm = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TemplateSide = {
  id: string;
  label_fa: string;
  sort_order: number;
  print_area: PrintAreaNorm;
  enabled?: boolean;
};

export type SideId = string;

export type PrintAreaPx = {
  left: number;
  top: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

const DEFAULT_PRINT: PrintAreaNorm = {
  x: 0.18,
  y: 0.14,
  width: 0.64,
  height: 0.52,
};

const PRODUCT_DEFAULT_SIDES: Record<string, TemplateSide[]> = {
  tshirt: [
    { id: "front", label_fa: "جلو", sort_order: 0, print_area: { ...DEFAULT_PRINT } },
    { id: "back", label_fa: "پشت", sort_order: 1, print_area: { ...DEFAULT_PRINT } },
  ],
  mug: [
    {
      id: "front",
      label_fa: "روی ماگ",
      sort_order: 0,
      print_area: { x: 0.22, y: 0.28, width: 0.56, height: 0.44 },
    },
  ],
  hoodie: [
    { id: "front", label_fa: "جلو", sort_order: 0, print_area: { ...DEFAULT_PRINT } },
    { id: "back", label_fa: "پشت", sort_order: 1, print_area: { ...DEFAULT_PRINT } },
  ],
};

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function normalizePrintArea(raw: Partial<PrintAreaNorm> | undefined): PrintAreaNorm {
  if (!raw) return { ...DEFAULT_PRINT };
  const x = clamp01(Number(raw.x ?? DEFAULT_PRINT.x));
  const y = clamp01(Number(raw.y ?? DEFAULT_PRINT.y));
  let w = clamp01(Number(raw.width ?? DEFAULT_PRINT.width));
  let h = clamp01(Number(raw.height ?? DEFAULT_PRINT.height));
  if (w < 0.05) w = 0.05;
  if (h < 0.05) h = 0.05;
  if (x + w > 1) w = 1 - x;
  if (y + h > 1) h = 1 - y;
  return { x, y, width: w, height: h };
}

/** تبدیل designArea قدیمی (گوشه‌ها روی تصویر مرجع) به نسبت canvas */
function legacyDesignAreaToPrintArea(
  designArea: { tl: number[]; tr: number[]; br: number[]; bl: number[] },
  refW = 1024,
  refH = 1024,
): PrintAreaNorm {
  const xs = [designArea.tl[0], designArea.tr[0], designArea.br[0], designArea.bl[0]];
  const ys = [designArea.tl[1], designArea.tr[1], designArea.br[1], designArea.bl[1]];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return normalizePrintArea({
    x: minX / refW,
    y: minY / refH,
    width: (maxX - minX) / refW,
    height: (maxY - minY) / refH,
  });
}

function sideFromLegacyView(
  id: string,
  label: string,
  order: number,
  config: ProductTemplate["config_json"],
): TemplateSide {
  const perSide = config.mockup?.side_print_areas?.[id];
  const global = config.mockup?.print_areas?.[id];
  const legacy = config.mockup?.designArea;
  let print_area = normalizePrintArea(perSide ?? global);
  if (!perSide && !global && legacy && order === 0) {
    print_area = legacyDesignAreaToPrintArea(legacy);
  }
  return { id, label_fa: label, sort_order: order, print_area };
}

/** سایدهای فعال قالب — از config.sides یا mockup.views یا پیش‌فرض محصول */
export function resolveTemplateSides(
  config: ProductTemplate["config_json"],
  productSlug: string,
): TemplateSide[] {
  const raw = config.sides;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw
      .filter((s) => s && s.enabled !== false && typeof s.id === "string")
      .map((s, i) => ({
        id: String(s.id).trim(),
        label_fa: String(s.label_fa || s.id).trim(),
        sort_order: Number(s.sort_order ?? i),
        print_area: normalizePrintArea(s.print_area),
        enabled: s.enabled !== false,
      }))
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  const views = config.mockup?.views ?? {};
  const viewIds = Object.keys(views);
  if (viewIds.length > 0) {
    const labels: Record<string, string> = {
      front: "جلو",
      back: "پشت",
      left: "چپ",
      right: "راست",
      wrap: "دورتا دور",
    };
    return viewIds.map((id, i) =>
      sideFromLegacyView(id, labels[id] ?? id, i, config),
    );
  }

  return PRODUCT_DEFAULT_SIDES[productSlug] ?? PRODUCT_DEFAULT_SIDES.tshirt;
}

export function printAreaToPixels(area: PrintAreaNorm): PrintAreaPx {
  const left = area.x * CANVAS_WIDTH;
  const top = area.y * CANVAS_HEIGHT;
  const width = area.width * CANVAS_WIDTH;
  const height = area.height * CANVAS_HEIGHT;
  return {
    left,
    top,
    width,
    height,
    centerX: left + width / 2,
    centerY: top + height / 2,
  };
}

export function getSidePrintArea(
  config: ProductTemplate["config_json"],
  productSlug: string,
  sideId: SideId,
): PrintAreaPx {
  const sides = resolveTemplateSides(config, productSlug);
  const side = sides.find((s) => s.id === sideId) ?? sides[0];
  return printAreaToPixels(side?.print_area ?? DEFAULT_PRINT);
}

export function emptyDraftForSides(sides: TemplateSide[]): Record<string, object[]> {
  return Object.fromEntries(sides.map((s) => [s.id, []]));
}

export const SIDE_ID_PATTERN = /^[a-z][a-z0-9_-]{0,31}$/;

export function isValidSideId(id: string) {
  return SIDE_ID_PATTERN.test(id);
}

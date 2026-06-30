import type { ProductTemplate } from "@/lib/customizer";

import {
  getSidePrintArea,
  resolveTemplateSides,
  type PrintAreaPx,
} from "./templateSides";
import { DRAFT_KEY_PREFIX } from "@/lib/storage-keys";

export type DesignDraft = Record<string, object[]>;

function objectCenter(obj: Record<string, unknown>): { cx: number; cy: number } {
  const left = Number(obj.left ?? 0);
  const top = Number(obj.top ?? 0);
  const originX = String(obj.originX ?? "left");
  const originY = String(obj.originY ?? "top");
  const w = Number(obj.width ?? 0) * Math.abs(Number(obj.scaleX ?? 1));
  const h = Number(obj.height ?? 0) * Math.abs(Number(obj.scaleY ?? 1));

  let cx = left;
  let cy = top;
  if (originX === "center") cx = left;
  else if (originX === "right") cx = left - w / 2;
  else cx = left + w / 2;

  if (originY === "center") cy = top;
  else if (originY === "bottom") cy = top - h / 2;
  else cy = top + h / 2;

  return { cx, cy };
}

function remapObject(
  obj: Record<string, unknown>,
  fromArea: PrintAreaPx,
  toArea: PrintAreaPx,
): Record<string, unknown> {
  const next = { ...obj };
  const { cx, cy } = objectCenter(obj);

  const nx = (cx - fromArea.centerX) / fromArea.width;
  const ny = (cy - fromArea.centerY) / fromArea.height;
  const scaleRatio = Math.min(toArea.width / fromArea.width, toArea.height / fromArea.height);

  const newCx = toArea.centerX + nx * toArea.width;
  const newCy = toArea.centerY + ny * toArea.height;

  next.originX = "center";
  next.originY = "center";
  next.left = newCx;
  next.top = newCy;

  if (obj.scaleX != null) next.scaleX = Number(obj.scaleX) * scaleRatio;
  if (obj.scaleY != null) next.scaleY = Number(obj.scaleY) * scaleRatio;
  if (obj.fontSize != null) next.fontSize = Math.max(8, Math.round(Number(obj.fontSize) * scaleRatio));

  return next;
}

/** انتقال draft بین دو قالب با تنظیم موقعیت نسبت به محدوده چاپ */
export function remapDesignDraft(
  draft: DesignDraft,
  fromTemplate: ProductTemplate,
  toTemplate: ProductTemplate,
): DesignDraft {
  const fromSides = resolveTemplateSides(fromTemplate.config_json, fromTemplate.slug);
  const toSides = resolveTemplateSides(toTemplate.config_json, toTemplate.slug);
  const toSideIds = new Set(toSides.map((s) => s.id));
  const defaultTarget = toSides[0]?.id ?? "front";

  const result: DesignDraft = Object.fromEntries(toSides.map((s) => [s.id, [] as object[]]));

  for (const fromSide of fromSides) {
    const objects = draft[fromSide.id];
    if (!objects?.length) continue;

    const targetSideId = toSideIds.has(fromSide.id) ? fromSide.id : defaultTarget;
    const fromArea = getSidePrintArea(fromTemplate.config_json, fromTemplate.slug, fromSide.id);
    const toArea = getSidePrintArea(toTemplate.config_json, toTemplate.slug, targetSideId);

    const remapped = objects.map((raw) =>
      remapObject(raw as Record<string, unknown>, fromArea, toArea),
    );
    result[targetSideId] = [...(result[targetSideId] ?? []), ...remapped];
  }

  return result;
}

/** تلاش برای نگه‌داشتن رنگ نزدیک هنگام عوض کردن محصول */
export function matchColorForTemplate(
  currentHex: string,
  template: ProductTemplate,
): { name: string; hex: string } {
  const colors = template.config_json.colors ?? [];
  if (!colors.length) return { name: "پیش‌فرض", hex: currentHex };
  const exact = colors.find((c) => c.hex.toLowerCase() === currentHex.toLowerCase());
  if (exact) return exact;
  return colors[0];
}

export function draftStorageKey(slug: string) {
  return `${DRAFT_KEY_PREFIX}${slug}`;
}

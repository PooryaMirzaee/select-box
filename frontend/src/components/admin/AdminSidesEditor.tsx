"use client";

import { Plus, Trash2, Upload } from "@/components/icons";
import { useCallback, useEffect, useState } from "react";

import {
  isValidSideId,
  resolveTemplateSides,
  type PrintAreaNorm,
  type TemplateSide,
} from "@/lib/fabricMockup/templateSides";
import type { ProductTemplate } from "@/lib/customizer";

type Props = {
  template: ProductTemplate;
  defaultViews: Record<string, string>;
  onSidesChange: (sides: TemplateSide[]) => void;
  onPickMockup: (view: string, color_hex?: string) => void;
};

function pct(n: number) {
  return Math.round(n * 1000) / 10;
}

function fromPct(v: number): number {
  return Math.min(1, Math.max(0, v / 100));
}

function patchPrintArea(
  side: TemplateSide,
  key: keyof PrintAreaNorm,
  pctValue: number,
): TemplateSide {
  const next = { ...side.print_area, [key]: fromPct(pctValue) };
  if (key === "x" && next.x + next.width > 1) next.width = 1 - next.x;
  if (key === "y" && next.y + next.height > 1) next.height = 1 - next.y;
  if (key === "width" && next.x + next.width > 1) next.width = 1 - next.x;
  if (key === "height" && next.y + next.height > 1) next.height = 1 - next.y;
  return { ...side, print_area: next };
}

export function AdminSidesEditor({
  template,
  defaultViews,
  onSidesChange,
  onPickMockup,
}: Props) {
  const [sides, setSides] = useState<TemplateSide[]>(() =>
    resolveTemplateSides(template.config_json, template.slug),
  );
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setSides(resolveTemplateSides(template.config_json, template.slug));
  }, [template.config_json, template.slug]);

  const emit = useCallback(
    (next: TemplateSide[]) => {
      setSides(next);
      onSidesChange(next);
    },
    [onSidesChange],
  );

  const updateSide = (index: number, patch: Partial<TemplateSide>) => {
    const next = [...sides];
    next[index] = { ...next[index], ...patch };
    emit(next);
  };

  const addSide = () => {
    const id = `side${sides.length + 1}`;
    if (!isValidSideId(id)) {
      setMsg("شناسه نما فقط حروف کوچک انگلیسی، عدد، - و _");
      return;
    }
    emit([
      ...sides,
      {
        id,
        label_fa: `نما ${sides.length + 1}`,
        sort_order: sides.length,
        print_area: { x: 0.18, y: 0.14, width: 0.64, height: 0.52 },
      },
    ]);
    setMsg(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">نماها (سایدها) و محدوده چاپ</h3>
          <p className="mt-1 text-xs text-muted">
            هر نما یک mockup جدا دارد. محدوده چاپ به‌صورت درصد از ابعاد Design Lab (۵۴۶×۶۴۰) است.
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-orange-400"
          onClick={addSide}
        >
          <Plus className="h-3 w-3" /> نما
        </button>
      </div>

      {msg ? <p className="text-xs text-red-400">{msg}</p> : null}

      <ul className="space-y-4">
        {sides.map((side, i) => (
          <li key={`${side.id}-${i}`} className="rounded-lg border border-theme p-4">
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-xs text-muted">
                شناسه (انگلیسی)
                <input
                  type="text"
                  value={side.id}
                  className="w-28 rounded border border-theme bg-transparent px-2 py-1 font-mono text-xs"
                  onChange={(e) => {
                    const id = e.target.value.trim().toLowerCase();
                    if (!isValidSideId(id) && id.length > 0) {
                      setMsg("شناسه: a-z، عدد، - و _ (۲–۳۲ کاراکتر)");
                      return;
                    }
                    setMsg(null);
                    updateSide(i, { id });
                  }}
                />
              </label>
              <label className="flex min-w-[120px] flex-1 flex-col gap-1 text-xs text-muted">
                عنوان فارسی
                <input
                  type="text"
                  value={side.label_fa}
                  className="rounded border border-theme bg-transparent px-2 py-1"
                  onChange={(e) => updateSide(i, { label_fa: e.target.value })}
                />
              </label>
              <label className="flex w-14 flex-col gap-1 text-xs text-muted">
                ترتیب
                <input
                  type="number"
                  value={side.sort_order}
                  className="rounded border border-theme bg-transparent px-2 py-1"
                  onChange={(e) => updateSide(i, { sort_order: Number(e.target.value) })}
                />
              </label>
              <button
                type="button"
                className="text-red-400"
                disabled={sides.length <= 1}
                onClick={() => emit(sides.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-xs font-medium text-muted">محدوده چاپ (%)</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["x", "چپ"],
                  ["y", "بالا"],
                  ["width", "عرض"],
                  ["height", "ارتفاع"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex flex-col gap-1 text-xs text-muted">
                  {label}
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={pct(side.print_area[key])}
                    className="rounded border border-theme bg-transparent px-2 py-1"
                    onChange={(e) =>
                      updateSide(i, patchPrintArea(side, key, Number(e.target.value)))
                    }
                  />
                </label>
              ))}
            </div>

            <div
              className="relative mx-auto mt-3 w-full max-w-[180px] rounded border border-theme bg-[var(--input-bg)]"
              style={{ aspectRatio: "546 / 640" }}
            >
              <div
                className="absolute border-2 border-dashed border-orange-400 bg-orange-400/15"
                style={{
                  left: `${side.print_area.x * 100}%`,
                  top: `${side.print_area.y * 100}%`,
                  width: `${side.print_area.width * 100}%`,
                  height: `${side.print_area.height * 100}%`,
                }}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg border border-theme px-3 py-2 text-xs hover:bg-[var(--input-bg)]"
                onClick={() => onPickMockup(side.id)}
              >
                <Upload className="h-3 w-3" />
                mockup پیش‌فرض
                {defaultViews[side.id] ? " ✓" : ""}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

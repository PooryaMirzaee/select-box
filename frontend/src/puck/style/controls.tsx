"use client";

import type { ReactElement } from "react";

type FieldRenderProps = {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  field: { label?: string };
};

const BRAND_SWATCHES = [
  { label: "اکسنت", value: "var(--accent)" },
  { label: "داغ", value: "var(--accent-hot)" },
  { label: "متن", value: "var(--fg)" },
  { label: "کم‌رنگ", value: "var(--fg-muted)" },
  { label: "پس‌زمینه", value: "var(--bg)" },
  { label: "کارت", value: "var(--card)" },
  { label: "حاشیه", value: "var(--border)" },
  { label: "سفید", value: "#ffffff" },
  { label: "مشکی", value: "#111111" },
  { label: "نارنجی", value: "#ff6a00" },
];

function toColorInput(v: string) {
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const r = v[1],
      g = v[2],
      b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#ff6a00";
}

function isHex(v: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v || "");
}

/** Color picker + متن + سواچ‌های برند */
export function ColorControl({
  value = "",
  onChange,
  readOnly,
}: FieldRenderProps): ReactElement {
  const current = value || "";
  return (
    <div className="flex flex-col gap-2" dir="rtl">
      <div className="flex items-center gap-2">
        <input
          type="color"
          disabled={readOnly}
          value={toColorInput(isHex(current) ? current : "#ff6a00")}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded border border-theme bg-transparent disabled:opacity-50"
          title="انتخاب رنگ"
        />
        <input
          type="text"
          disabled={readOnly}
          value={current}
          placeholder="#ff6a00 یا var(--accent)"
          onChange={(e) => onChange(e.target.value)}
          className="min-h-10 flex-1 rounded-lg border border-theme bg-transparent px-3 text-sm"
        />
        {current ? (
          <button
            type="button"
            disabled={readOnly}
            className="rounded-lg border border-theme px-2 py-2 text-xs text-muted"
            onClick={() => onChange("")}
          >
            پاک
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {BRAND_SWATCHES.map((s) => {
          const active = current === s.value;
          return (
            <button
              key={s.value}
              type="button"
              disabled={readOnly}
              title={s.label}
              onClick={() => onChange(s.value)}
              className={`flex h-8 items-center gap-1.5 rounded-full border px-2 text-[11px] ${
                active
                  ? "border-[var(--accent)] ring-1 ring-[var(--accent)]"
                  : "border-theme"
              }`}
            >
              <span
                className="inline-block h-3.5 w-3.5 rounded-full border border-black/10"
                style={{ background: s.value }}
              />
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Preset = { label: string; value: string };

/** انتخاب سریع از preset + امکان مقدار سفارشی */
export function PresetControl({
  value = "",
  onChange,
  readOnly,
  presets,
  placeholder = "سفارشی…",
  allowCustom = true,
}: FieldRenderProps & {
  presets: Preset[];
  placeholder?: string;
  allowCustom?: boolean;
}): ReactElement {
  const current = value || "";
  const matched = presets.some((p) => p.value === current);
  return (
    <div className="flex flex-col gap-2" dir="rtl">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => {
          const active = current === p.value;
          return (
            <button
              key={`${p.label}-${p.value || "empty"}`}
              type="button"
              disabled={readOnly}
              onClick={() => onChange(p.value)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                  : "border-theme hover:border-[var(--accent)]/50"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {allowCustom ? (
        <input
          type="text"
          disabled={readOnly}
          value={matched && current !== "" ? "" : current}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-10 w-full rounded-lg border border-theme bg-transparent px-3 text-sm"
        />
      ) : null}
    </div>
  );
}

/** اسلایدر شفافیت ۰–۱ */
export function OpacityControl({
  value = "",
  onChange,
  readOnly,
}: FieldRenderProps): ReactElement {
  const num = value === "" ? 1 : Number(value);
  const safe = Number.isFinite(num) ? Math.min(1, Math.max(0, num)) : 1;
  return (
    <div className="flex items-center gap-3" dir="rtl">
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        disabled={readOnly}
        value={safe}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1"
      />
      <span className="w-12 text-center text-xs tabular-nums">{safe.toFixed(2)}</span>
      <button
        type="button"
        disabled={readOnly}
        className="rounded border border-theme px-2 py-1 text-[11px]"
        onClick={() => onChange("")}
      >
        پیش‌فرض
      </button>
    </div>
  );
}

export function colorField(label: string) {
  return {
    type: "custom" as const,
    label,
    render: ({ value, onChange, readOnly, field }: FieldRenderProps & { field: { label?: string } }) => (
      <ColorControl
        value={(value as string) || ""}
        onChange={onChange}
        readOnly={readOnly}
        field={field}
      />
    ),
  };
}

export function presetField(
  label: string,
  presets: Preset[],
  opts?: { placeholder?: string; allowCustom?: boolean },
) {
  return {
    type: "custom" as const,
    label,
    render: ({ value, onChange, readOnly, field }: FieldRenderProps & { field: { label?: string } }) => (
      <PresetControl
        value={(value as string) || ""}
        onChange={onChange}
        readOnly={readOnly}
        field={field}
        presets={presets}
        placeholder={opts?.placeholder}
        allowCustom={opts?.allowCustom !== false}
      />
    ),
  };
}

export function opacityField(label: string) {
  return {
    type: "custom" as const,
    label,
    render: ({ value, onChange, readOnly, field }: FieldRenderProps & { field: { label?: string } }) => (
      <OpacityControl
        value={(value as string) || ""}
        onChange={onChange}
        readOnly={readOnly}
        field={field}
      />
    ),
  };
}

export const SPACE_PRESETS: Preset[] = [
  { label: "۰", value: "0" },
  { label: "۴", value: "0.25rem" },
  { label: "۸", value: "0.5rem" },
  { label: "۱۲", value: "0.75rem" },
  { label: "۱۶", value: "1rem" },
  { label: "۲۴", value: "1.5rem" },
  { label: "۳۲", value: "2rem" },
  { label: "۴۸", value: "3rem" },
  { label: "۶۴", value: "4rem" },
];

export const RADIUS_PRESETS: Preset[] = [
  { label: "بدون", value: "0" },
  { label: "کم", value: "0.25rem" },
  { label: "متوسط", value: "0.5rem" },
  { label: "زیاد", value: "1rem" },
  { label: "خیلی زیاد", value: "1.5rem" },
  { label: "کامل", value: "9999px" },
];

export const FONT_SIZE_PRESETS: Preset[] = [
  { label: "xs", value: "0.75rem" },
  { label: "sm", value: "0.875rem" },
  { label: "base", value: "1rem" },
  { label: "lg", value: "1.125rem" },
  { label: "xl", value: "1.25rem" },
  { label: "2xl", value: "1.5rem" },
  { label: "3xl", value: "1.875rem" },
  { label: "4xl", value: "2.25rem" },
];

export const BORDER_WIDTH_PRESETS: Preset[] = [
  { label: "بدون", value: "0" },
  { label: "۱px", value: "1px" },
  { label: "۲px", value: "2px" },
  { label: "۳px", value: "3px" },
  { label: "۴px", value: "4px" },
];

export const LINE_HEIGHT_PRESETS: Preset[] = [
  { label: "فشرده", value: "1.2" },
  { label: "عادی", value: "1.5" },
  { label: "راحت", value: "1.75" },
  { label: "باز", value: "2" },
];

export const MAX_WIDTH_PRESETS: Preset[] = [
  { label: "sm", value: "24rem" },
  { label: "md", value: "28rem" },
  { label: "lg", value: "32rem" },
  { label: "xl", value: "36rem" },
  { label: "2xl", value: "42rem" },
  { label: "فروشگاه", value: "var(--shop-max)" },
  { label: "کامل", value: "100%" },
];

export const GRADIENT_PRESETS: Preset[] = [
  { label: "بدون", value: "" },
  {
    label: "شگفت",
    value: "linear-gradient(115deg, var(--amazing-from), var(--amazing-to))",
  },
  {
    label: "اکسنت نرم",
    value: "linear-gradient(135deg, var(--accent-soft), var(--card))",
  },
  {
    label: "تیره",
    value: "linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.15))",
  },
];

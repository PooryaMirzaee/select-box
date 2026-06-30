"use client";

import { Loader2, Plus, Trash2, Upload } from "@/components/icons";
import { useCallback, useEffect, useRef, useState } from "react";

import { AdminSidesEditor } from "@/components/admin/AdminSidesEditor";
import { Button } from "@/components/ui/Button";
import { resolveTemplateSides, type TemplateSide } from "@/lib/fabricMockup/templateSides";
import {
  adminUpdateTemplateConfig,
  adminUploadTemplateFont,
  adminUploadTemplateMockup,
  type ProductTemplate,
} from "@/lib/customizer";

type ColorRow = {
  name: string;
  hex: string;
  views?: Record<string, string>;
};

type FontRow = {
  name: string;
  family: string;
  url?: string;
};

type Props = {
  template: ProductTemplate;
  token: string;
  onUpdated: (t: ProductTemplate) => void;
};

export function AdminTemplateEditor({ template, token, onUpdated }: Props) {
  const [colors, setColors] = useState<ColorRow[]>(template.config_json.colors ?? []);
  const [sizes, setSizes] = useState<string[]>(template.config_json.sizes ?? []);
  const [fonts, setFonts] = useState<FontRow[]>(template.config_json.fonts ?? []);
  const [sides, setSides] = useState<TemplateSide[]>(() =>
    resolveTemplateSides(template.config_json, template.slug),
  );
  const [defaultViews, setDefaultViews] = useState<Record<string, string>>(
    template.config_json.mockup?.views ?? {},
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const mockupRef = useRef<HTMLInputElement>(null);
  const fontRef = useRef<HTMLInputElement>(null);
  const [uploadCtx, setUploadCtx] = useState<{
    view: string;
    color_hex?: string;
  } | null>(null);
  const [fontForm, setFontForm] = useState({ name: "", family: "" });

  useEffect(() => {
    setColors(template.config_json.colors ?? []);
    setSizes(template.config_json.sizes ?? []);
    setDefaultViews(template.config_json.mockup?.views ?? {});
    setFonts(template.config_json.fonts ?? []);
    setSides(resolveTemplateSides(template.config_json, template.slug));
  }, [template]);

  const mergeColorViews = useCallback(
    (rows: ColorRow[]): ColorRow[] => {
      const serverColors = template.config_json.colors ?? [];
      return rows.map((c) => {
        const server = serverColors.find((sc) => sc.hex.toLowerCase() === c.hex.toLowerCase());
        const views = { ...(server?.views ?? {}), ...(c.views ?? {}) };
        return Object.keys(views).length ? { ...c, views } : c;
      });
    },
    [template.config_json.colors],
  );

  const saveConfig = useCallback(async () => {
    setSaving(true);
    setMsg(null);
    try {
      const viewKeys = sides.map((s) => s.id);
      const mockupViews = Object.fromEntries(
        Object.entries(defaultViews).filter(([k]) => viewKeys.includes(k)),
      );
      const mergedColors = mergeColorViews(colors);
      const config = {
        ...template.config_json,
        sides,
        colors: mergedColors,
        sizes,
        fonts,
        mockup: {
          ...(template.config_json.mockup ?? {}),
          views: mockupViews,
        },
      };
      const updated = await adminUpdateTemplateConfig(template.slug, config, token);
      onUpdated(updated);
      setColors(updated.config_json.colors ?? []);
      setSizes(updated.config_json.sizes ?? []);
      setDefaultViews(updated.config_json.mockup?.views ?? {});
      setSides(resolveTemplateSides(updated.config_json, template.slug));
      setMsg("ذخیره شد ✓");
    } catch {
      setMsg("خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  }, [colors, defaultViews, fonts, mergeColorViews, onUpdated, sides, sizes, template.config_json, template.slug, token]);

  const onMockupFile = async (file: File) => {
    if (!uploadCtx) return;
    setSaving(true);
    setMsg(null);
    try {
      const updated = await adminUploadTemplateMockup(template.slug, file, uploadCtx, token);
      onUpdated(updated);
      setColors(updated.config_json.colors ?? []);
      setDefaultViews(updated.config_json.mockup?.views ?? {});
      setMsg("عکس آپلود شد ✓");
    } catch {
      setMsg("خطا در آپلود عکس");
    } finally {
      setSaving(false);
      setUploadCtx(null);
    }
  };

  const onFontFile = async (file: File) => {
    if (!fontForm.name.trim() || !fontForm.family.trim()) {
      setMsg("نام و family فونت را وارد کنید");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const updated = await adminUploadTemplateFont(
        template.slug,
        file,
        { name: fontForm.name.trim(), family: fontForm.family.trim() },
        token,
      );
      onUpdated(updated);
      setFonts(updated.config_json.fonts ?? []);
      setFontForm({ name: "", family: "" });
      setMsg("فونت آپلود شد ✓");
    } catch {
      setMsg("خطا در آپلود فونت");
    } finally {
      setSaving(false);
    }
  };

  const pickMockup = (view: string, color_hex?: string) => {
    setUploadCtx({ view, color_hex });
    mockupRef.current?.click();
  };

  return (
    <div className="mt-4 space-y-6 rounded-xl border border-theme p-4 text-sm">
      <input
        ref={mockupRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onMockupFile(f);
          e.target.value = "";
        }}
      />
      <input
        ref={fontRef}
        type="file"
        accept=".woff,.woff2,.ttf,.otf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFontFile(f);
          e.target.value = "";
        }}
      />

      <AdminSidesEditor
        template={template}
        defaultViews={defaultViews}
        onSidesChange={setSides}
        onPickMockup={pickMockup}
      />

      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-medium">رنگ‌ها و mockup اختصاصی</h3>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-orange-400"
            onClick={() => setColors((c) => [...c, { name: "رنگ جدید", hex: "#ffffff" }])}
          >
            <Plus className="h-3 w-3" /> رنگ
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">
          برای هر رنگ می‌توانید mockup جدا برای هر نما آپلود کنید؛ در غیر این صورت از mockup پیش‌فرض نما
          استفاده می‌شود.
        </p>
        <ul className="mt-3 space-y-3">
          {colors.map((c, i) => (
            <li key={`${c.hex}-${i}`} className="rounded-lg border border-theme p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  value={c.hex}
                  onChange={(e) => {
                    const next = [...colors];
                    next[i] = { ...c, hex: e.target.value };
                    setColors(next);
                  }}
                  className="h-8 w-10 cursor-pointer"
                />
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => {
                    const next = [...colors];
                    next[i] = { ...c, name: e.target.value };
                    setColors(next);
                  }}
                  className="min-w-[100px] flex-1 rounded border border-theme bg-transparent px-2 py-1"
                />
                <button
                  type="button"
                  className="text-red-400"
                  onClick={() => setColors(colors.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {sides.map((side) => (
                  <button
                    key={side.id}
                    type="button"
                    className="rounded border border-theme px-2 py-1 text-xs hover:bg-[var(--input-bg)]"
                    onClick={() => pickMockup(side.id, c.hex)}
                  >
                    {side.label_fa}
                    {c.views?.[side.id] ? " ✓" : ""}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-medium">سایزها (اختیاری)</h3>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-orange-400"
            onClick={() => setSizes((s) => [...s, "M"])}
          >
            <Plus className="h-3 w-3" /> سایز
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">
          برای محصولاتی مثل ماگ که سایز ندارند، این بخش را خالی بگذارید. تنوع‌های فروش فقط بر اساس رنگ ساخته
          می‌شوند.
        </p>
        {sizes.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {sizes.map((sz, i) => (
              <li key={`${sz}-${i}`} className="flex items-center gap-1 rounded-lg border border-theme px-2 py-1">
                <input
                  type="text"
                  value={sz}
                  onChange={(e) => {
                    const next = [...sizes];
                    next[i] = e.target.value;
                    setSizes(next);
                  }}
                  className="w-16 bg-transparent text-sm outline-none"
                />
                <button type="button" className="text-red-400" onClick={() => setSizes(sizes.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted">بدون سایز — فقط رنگ</p>
        )}
      </div>

      <div>
        <h3 className="font-medium">فونت‌های سفارشی</h3>
        <ul className="mt-2 space-y-1 text-xs text-muted">
          {fonts.map((f) => (
            <li key={f.family}>
              {f.name} — <code>{f.family}</code>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="نام نمایشی"
            value={fontForm.name}
            onChange={(e) => setFontForm((p) => ({ ...p, name: e.target.value }))}
            className="rounded border border-theme bg-transparent px-2 py-1"
          />
          <input
            type="text"
            placeholder="font-family"
            value={fontForm.family}
            onChange={(e) => setFontForm((p) => ({ ...p, family: e.target.value }))}
            className="rounded border border-theme bg-transparent px-2 py-1"
          />
          <button
            type="button"
            className="flex items-center gap-1 rounded border border-theme px-3 py-1"
            onClick={() => fontRef.current?.click()}
          >
            <Upload className="h-3 w-3" /> آپلود فونت
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" disabled={saving} onClick={() => void saveConfig()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره تنظیمات"}
        </Button>
        {msg ? <span className="text-xs text-orange-400">{msg}</span> : null}
      </div>
    </div>
  );
}

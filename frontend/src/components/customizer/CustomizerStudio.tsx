"use client";

import dynamic from "next/dynamic";
import { Loader2, ShoppingBag, Sparkles, Upload } from "@/components/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ensureCartSession } from "@/lib/api";
import { apiUrl } from "@/lib/api-base";
import {
  DEFAULT_TRANSFORM,
  type CustomizationPayload,
  type CustomizationTransform,
  type ProductTemplate,
  addCustomToCart,
  publishDesign,
  uploadArtwork,
  artworkPreviewUrl,
} from "@/lib/customizer";
import { formatToman } from "@/lib/utils";
import { CART_EVENTS } from "@/lib/storage-keys";

const FabricCustomizerEditor = dynamic(
  () => import("@/components/customizer/FabricCustomizerEditor").then((m) => m.FabricCustomizerEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] w-full items-center justify-center rounded-2xl bg-[var(--bg-elevated)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-theme border-t-[var(--accent)]" />
      </div>
    ),
  },
);

type Props = {
  template: ProductTemplate;
  categories?: { id: number; name_fa: string }[];
};

export function CustomizerStudio({ template, categories = [] }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [storageKey, setStorageKey] = useState("");
  const [uploading, setUploading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [transform, setTransform] = useState<CustomizationTransform>({ ...DEFAULT_TRANSFORM });
  const [color, setColor] = useState(template.config_json.colors?.[0] ?? { name: "مشکی", hex: "#1a1a20" });
  const [size, setSize] = useState(template.config_json.sizes?.[1] ?? "M");
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishTitle, setPublishTitle] = useState("");
  const [publishCategoryId, setPublishCategoryId] = useState(categories[0]?.id ?? 0);
  const [userToken, setUserToken] = useState<string | null>(null);

  const sizes = template.config_json.sizes ?? [];
  const colors = template.config_json.colors ?? [];

  useEffect(() => {
    if (typeof window === "undefined") return;
    setUserToken(localStorage.getItem("coralay_token") ?? localStorage.getItem("coralay_admin_token"));
  }, []);

  const customization = useMemo((): CustomizationPayload | null => {
    if (!artworkUrl || !storageKey) return null;
    return {
      product_type: template.slug,
      artwork_url: artworkUrl.startsWith("/api/media/")
        ? apiUrl(`/api/v1/media/${storageKey}`)
        : artworkUrl,
      artwork_storage_key: storageKey,
      color_hex: color.hex,
      color_name: color.name,
      size_label: sizes.length ? size : null,
      transform,
      title: publishTitle || undefined,
    };
  }, [artworkUrl, storageKey, template.slug, color, size, sizes.length, transform, publishTitle]);

  const onFile = useCallback(async (file: File) => {
    setUploading(true);
    setMessage(null);
    const blobUrl = URL.createObjectURL(file);
    setArtworkUrl(blobUrl);
    try {
      const res = await uploadArtwork(file);
      setStorageKey(res.storage_key);
      setArtworkUrl(artworkPreviewUrl(res.storage_key));
    } catch {
      setArtworkUrl(null);
      setMessage("آپلود ناموفق — فرمت PNG/JPG/WebP تا ۸MB");
    } finally {
      URL.revokeObjectURL(blobUrl);
      setUploading(false);
    }
  }, []);

  const addToCart = useCallback(async () => {
    if (!customization || !template.default_variation_id) {
      setMessage("ابتدا تصویر طرح را آپلود کنید");
      return;
    }
    setAdding(true);
    setMessage(null);
    try {
      const sid = await ensureCartSession();
      await addCustomToCart(template.default_variation_id, 1, customization, sid);
      window.dispatchEvent(new CustomEvent(CART_EVENTS.update));
      window.dispatchEvent(new CustomEvent(CART_EVENTS.open));
      setMessage("به سبد اضافه شد ✓");
    } catch {
      setMessage("خطا در افزودن به سبد");
    } finally {
      setAdding(false);
    }
  }, [customization, template.default_variation_id]);

  const handlePublish = useCallback(async () => {
    if (!customization || !publishTitle.trim()) {
      setMessage("عنوان طرح را وارد کنید");
      return;
    }
    let token = userToken;
    const isAdmin = typeof window !== "undefined" && !!localStorage.getItem("coralay_admin_token") && !localStorage.getItem("coralay_token");
    if (!token) {
      setMessage("برای ثبت در ویترین، از حساب کاربری وارد شوید (/account)");
      setPublishOpen(true);
      return;
    }
    setPublishing(true);
    setMessage(null);
    try {
      const res = await publishDesign(
        {
          title: publishTitle.trim(),
          thematic_category_id: publishCategoryId,
          product_types: [template.slug],
          customization,
          status: "published",
        },
        token,
        isAdmin,
      );
      setMessage(`محصول منتشر شد — ${res.products.map((p) => p.title).join("، ")}`);
      setPublishOpen(false);
    } catch {
      setMessage("انتشار ناموفق — وارد حساب شده‌اید؟");
    } finally {
      setPublishing(false);
    }
  }, [customization, publishTitle, publishCategoryId, template.slug, userToken]);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-2 lg:gap-12">
      {/* پیش‌نمایش mockup واقعی */}
      <div className="flex flex-col items-center rounded-2xl border border-theme bg-[var(--bg-elevated)] p-6">
        <FabricCustomizerEditor
          productType={template.slug}
          colorHex={color.hex}
          artworkUrl={artworkUrl}
          onTransformChange={setTransform}
          className="w-full"
        />
        <p className="mt-4 text-lg font-semibold">{template.name_fa}</p>
        <p className="text-sm text-muted">{formatToman(template.base_price)}</p>
      </div>

      {/* کنترل‌ها */}
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-semibold">طراحی {template.name_fa} سفارشی</h1>
          <p className="mt-1 text-sm text-muted">
            {template.slug === "mug"
              ? "ماگ سرامیکی 11oz (325ml) — ابعاد استاندارد چاپ"
              : (template.description ?? "عکس دلخواهتان را آپلود و سفارش دهید")}
          </p>
        </div>

        {/* آپلود */}
        <div>
          <label className="mb-2 block text-sm font-medium">تصویر طرح</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-theme bg-[var(--bg-elevated)] px-4 py-8 text-sm text-muted transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            {artworkUrl ? "تغییر تصویر" : "انتخاب تصویر (PNG, JPG, WebP)"}
          </button>
          {artworkUrl ? (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-theme p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={artworkUrl} alt="پیش‌نمایش طرح" className="h-16 w-16 rounded-lg object-cover" />
              <p className="text-xs text-muted">طرح آپلود شد — روی تیشرت بکشید و اندازه دهید</p>
            </div>
          ) : null}
        </div>

        {/* رنگ */}
        {colors.length > 0 ? (
          <div>
            <label className="mb-2 block text-sm font-medium">رنگ</label>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.name}
                  onClick={() => setColor(c)}
                  className="h-10 w-10 rounded-full border-2 transition"
                  style={{
                    backgroundColor: c.hex,
                    borderColor: color.hex === c.hex ? "var(--accent)" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* سایز */}
        {sizes.length > 0 ? (
          <div>
            <label className="mb-2 block text-sm font-medium">سایز</label>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`min-h-[40px] min-w-[40px] rounded-lg border px-3 text-sm transition ${
                    size === s ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-theme"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {message ? <p className="text-sm text-[var(--accent)]">{message}</p> : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1 gap-2" onClick={() => void addToCart()} disabled={adding || !artworkUrl}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
            افزودن به سبد
          </Button>
          <Button variant="outline" className="flex-1 gap-2" onClick={() => setPublishOpen((o) => !o)} disabled={!artworkUrl}>
            <Sparkles className="h-4 w-4" />
            فروش طرح
          </Button>
        </div>

        {publishOpen ? (
          <div className="space-y-3 rounded-xl border border-theme bg-[var(--bg-elevated)] p-4">
            <p className="text-sm text-muted">
              اثرتان را در ویترین منتشر کنید و از هر خرید {15}٪ سهم بگیرید.
            </p>
            <input
              type="text"
              placeholder="عنوان طرح"
              value={publishTitle}
              onChange={(e) => setPublishTitle(e.target.value)}
              className="w-full rounded-lg border border-theme bg-transparent px-3 py-2 text-sm"
            />
            {categories.length > 0 ? (
              <select
                value={publishCategoryId}
                onChange={(e) => setPublishCategoryId(Number(e.target.value))}
                className="w-full rounded-lg border border-theme bg-transparent px-3 py-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_fa}
                  </option>
                ))}
              </select>
            ) : null}
            <Button className="w-full" onClick={() => void handlePublish()} disabled={publishing}>
              {publishing ? "در حال ثبت..." : "ثبت در ویترین"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

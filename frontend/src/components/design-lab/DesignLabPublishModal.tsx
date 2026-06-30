"use client";

import { Check, Loader2 } from "@/components/icons";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import type { ProductTemplate } from "@/lib/customizer";
import { formatToman } from "@/lib/utils";

type PublishResult = {
  products: { id: number; slug: string; title: string; status: string }[];
  message?: string;
};

type Props = {
  currentTemplateSlug: string;
  allTemplates: ProductTemplate[];
  templatesLoading?: boolean;
  onClose: () => void;
  onPublished: (result: {
    product_titles?: string[];
    message?: string;
  }) => void;
  onNeedLogin: () => void;
  generateProductPreview: (target: ProductTemplate) => Promise<string | null>;
  currentPreviewUrl?: string | null;
  onSubmit: (data: {
    title: string;
    description?: string;
    productTypes: string[];
  }) => Promise<PublishResult>;
};

function templateThumb(t: ProductTemplate): string | null {
  const colors = t.config_json.colors ?? [];
  for (const c of colors) {
    const front = c.views?.front;
    if (front) return front;
  }
  return t.config_json.mockup?.views?.front ?? null;
}

export function DesignLabPublishModal({
  currentTemplateSlug,
  allTemplates,
  templatesLoading = false,
  onClose,
  onPublished,
  onNeedLogin,
  generateProductPreview,
  currentPreviewUrl,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set([currentTemplateSlug]));
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [previewMap, setPreviewMap] = useState<Record<string, string>>(() =>
    currentPreviewUrl ? { [currentTemplateSlug]: currentPreviewUrl } : {},
  );
  const [previewLoadingSlugs, setPreviewLoadingSlugs] = useState<Set<string>>(new Set());
  const previewUrlsRef = useRef<string[]>([]);

  const templates = allTemplates.length ? allTemplates : [];

  useEffect(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.add(currentTemplateSlug);
      return next;
    });
  }, [currentTemplateSlug]);

  useEffect(() => {
    if (!templates.length) return;
    let cancelled = false;

    void (async () => {
      for (const t of templates) {
        if (cancelled) break;
        if (t.slug === currentTemplateSlug && currentPreviewUrl) continue;
        setPreviewLoadingSlugs((prev) => new Set(prev).add(t.slug));
        try {
          const url = await generateProductPreview(t);
          if (cancelled || !url) continue;
          previewUrlsRef.current.push(url);
          setPreviewMap((prev) => ({ ...prev, [t.slug]: url }));
        } catch {
          /* fallback to template thumb */
        } finally {
          if (!cancelled) {
            setPreviewLoadingSlugs((prev) => {
              const next = new Set(prev);
              next.delete(t.slug);
              return next;
            });
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
    };
  }, [templates, generateProductPreview, currentPreviewUrl, currentTemplateSlug]);

  const selectedList = useMemo(
    () => templates.filter((t) => selected.has(t.slug)),
    [selected, templates],
  );

  const toggleProduct = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        if (slug === currentTemplateSlug && next.size === 1) return prev;
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const submit = async () => {
    if (!title.trim()) {
      setMsg("نام محصول را وارد کنید");
      return;
    }
    if (selected.size === 0) {
      setMsg("حداقل یک محصول انتخاب کنید");
      return;
    }

    setLoading(true);
    setMsg(null);
    setProgress(
      selected.size > 1 ? "در حال آماده‌سازی پیش‌نمایش برای هر محصول…" : "در حال ثبت…",
    );

    try {
      const res = await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        productTypes: Array.from(selected),
      });
      onPublished({
        product_titles: res.products.map((p) => p.title),
        message: res.message ?? undefined,
      });
    } catch (e) {
      const err = e instanceof Error ? e.message : "";
      if (err.toLowerCase().includes("unauthorized") || err.includes("401")) {
        onNeedLogin();
      } else if (err.toLowerCase().includes("failed to fetch") || err.includes("NetworkError")) {
        setMsg("اتصال به سرور برقرار نشد — بک‌اند را روی پورت ۸۰۰۰ اجرا کنید");
      } else {
        setMsg(err || "خطا در ثبت محصول");
      }
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const previewsLoading = previewLoadingSlugs.size > 0;

  return (
    <div className="design-lab-modal-backdrop">
      <div className="design-lab-modal design-lab-publish-modal">
        <h2>ثبت در ویترین من</h2>
        <p className="mt-1 text-sm text-muted">
          طرحتان روی محصولات انتخاب‌شده ساخته می‌شود و پس از تأیید در استودیوی شما نمایش داده می‌شود.
        </p>

        <label className="mt-4 block text-xs font-semibold uppercase text-muted">نام محصول</label>
        <input
          type="text"
          className="mt-1 w-full rounded border border-theme px-3 py-2"
          placeholder="مثلاً تیشرت فیلم X"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="mt-3 block text-xs font-semibold uppercase text-muted">توضیحات</label>
        <textarea
          rows={2}
          className="mt-1 w-full rounded border border-theme px-3 py-2"
          placeholder="داستان طرح، الهام، …"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold uppercase text-muted">محصولات</label>
            <span className="text-xs text-muted">
              {selected.size} انتخاب شده
              {previewsLoading ? " · در حال ساخت پیش‌نمایش…" : null}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            پیش‌نمایش هر محصول با طرح فعلی شما
          </p>

          {templatesLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              بارگذاری محصولات…
            </div>
          ) : (
            <ul className="design-lab-publish-product-grid mt-3">
              {templates.map((t) => {
                const isSelected = selected.has(t.slug);
                const isCurrent = t.slug === currentTemplateSlug;
                const designPreview = previewMap[t.slug];
                const fallback = templateThumb(t);
                const isPreviewLoading = previewLoadingSlugs.has(t.slug);
                const imgSrc = designPreview ?? fallback;

                return (
                  <li key={t.slug}>
                    <button
                      type="button"
                      className={`design-lab-publish-product-card${isSelected ? " is-selected" : ""}`}
                      onClick={() => toggleProduct(t.slug)}
                    >
                      <span className={`design-lab-publish-check${isSelected ? " is-on" : ""}`}>
                        {isSelected ? <Check size={12} strokeWidth={3} /> : null}
                      </span>
                      <span className="design-lab-change-product-thumb design-lab-publish-preview-thumb">
                        {isPreviewLoading ? (
                          <span className="design-lab-publish-preview-loading">
                            <Loader2 className="h-5 w-5 animate-spin text-muted" />
                          </span>
                        ) : imgSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgSrc} alt={`پیش‌نمایش ${t.name_fa}`} />
                        ) : (
                          <span className="design-lab-change-product-placeholder">
                            {t.name_fa.slice(0, 1)}
                          </span>
                        )}
                      </span>
                      <span className="design-lab-change-product-meta">
                        <strong>{t.name_fa}</strong>
                        <span>{formatToman(t.base_price)}</span>
                      </span>
                      {isCurrent ? (
                        <span className="design-lab-change-product-badge">طراحی فعلی</span>
                      ) : designPreview ? (
                        <span className="design-lab-publish-preview-badge">پیش‌نمایش طرح</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {selectedList.length > 1 ? (
          <p className="mt-3 text-xs text-muted">
            ثبت: {selectedList.map((t) => t.name_fa).join(" · ")}
          </p>
        ) : null}

        {progress ? <p className="mt-3 text-sm text-muted">{progress}</p> : null}
        {msg ? <p className="mt-3 text-sm text-red-500">{msg}</p> : null}

        <div className="mt-6 flex gap-2">
          <Button variant="outline" className="flex-1" disabled={loading} onClick={onClose}>
            انصراف
          </Button>
          <Button className="flex-1" disabled={loading || selected.size === 0} onClick={() => void submit()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `ثبت ${selected.size} محصول`}
          </Button>
        </div>
      </div>
    </div>
  );
}

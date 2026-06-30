"use client";

import { Loader2, X } from "@/components/icons";
import { useMemo, useState } from "react";

import type { ProductTemplate } from "@/lib/customizer";
import { formatToman } from "@/lib/utils";

type Props = {
  currentSlug: string;
  templates: ProductTemplate[];
  loading?: boolean;
  onClose: () => void;
  onSelect: (template: ProductTemplate) => void;
};

function templateThumb(t: ProductTemplate): string | null {
  const colors = t.config_json.colors ?? [];
  for (const c of colors) {
    const front = c.views?.front;
    if (front) return front;
  }
  return t.config_json.mockup?.views?.front ?? null;
}

export function ChangeProductModal({
  currentSlug,
  templates,
  loading = false,
  onClose,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name_fa.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q),
    );
  }, [query, templates]);

  return (
    <div className="design-lab-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="change-product-title">
      <div className="design-lab-modal design-lab-change-product-modal">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="change-product-title">تغییر محصول</h2>
            <p className="mt-1 text-sm text-[var(--dl-muted)]">
              محصول را عوض کنید — طرح فعلی‌تان حفظ می‌شود
            </p>
          </div>
          <button type="button" className="design-lab-modal-close" onClick={onClose} aria-label="بستن">
            <X size={18} />
          </button>
        </div>

        <input
          type="search"
          placeholder="جستجو…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="design-lab-change-product-search mt-4"
        />

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            در حال بارگذاری محصولات…
          </div>
        ) : (
          <ul className="design-lab-change-product-grid mt-4">
            {filtered.map((t) => {
              const thumb = templateThumb(t);
              const isCurrent = t.slug === currentSlug;
              return (
                <li key={t.slug}>
                  <button
                    type="button"
                    className={`design-lab-change-product-card${isCurrent ? " is-current" : ""}`}
                    disabled={isCurrent}
                    onClick={() => onSelect(t)}
                  >
                    <span className="design-lab-change-product-thumb">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" />
                      ) : (
                        <span className="design-lab-change-product-placeholder">{t.name_fa.slice(0, 1)}</span>
                      )}
                    </span>
                    <span className="design-lab-change-product-meta">
                      <strong>{t.name_fa}</strong>
                      <span>{formatToman(t.base_price)}</span>
                    </span>
                    {isCurrent ? <span className="design-lab-change-product-badge">فعلی</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">محصولی یافت نشد</p>
        ) : null}
      </div>
    </div>
  );
}

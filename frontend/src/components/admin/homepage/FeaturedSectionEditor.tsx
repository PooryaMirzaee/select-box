"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  adminFetch,
  fetchProducts,
  type ProductSummary,
} from "@/lib/api";
import { flattenTree, parentSelectOptions, type CategoryTreeNode } from "@/lib/category-tree";
import type { HomepageFeaturedConfig } from "@/lib/homepage";
import { cn } from "@/lib/utils";

const inputClass = "rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm w-full";

type Props = {
  value: HomepageFeaturedConfig;
  onChange: (next: HomepageFeaturedConfig) => void;
  token: string;
};

type PickRow = {
  id: number;
  title: string;
  image_url: string | null;
};

export function FeaturedSectionEditor({ value, onChange, token }: Props) {
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickRow[]>([]);
  const [selectedMeta, setSelectedMeta] = useState<Record<number, PickRow>>({});
  const [searching, setSearching] = useState(false);

  const categoryOptions = useMemo(
    () => parentSelectOptions(categoryTree, new Set()),
    [categoryTree],
  );

  useEffect(() => {
    adminFetch<CategoryTreeNode[]>("/api/v1/admin/categories/tree", token)
      .then(setCategoryTree)
      .catch(() => setCategoryTree([]));
  }, [token]);

  useEffect(() => {
    const ids = value.product_ids ?? [];
    if (!ids.length) return;
    const missing = ids.filter((id) => !selectedMeta[id]);
    if (!missing.length) return;
    fetchProducts(undefined, undefined, { ids: missing })
      .then((res) => {
        setSelectedMeta((prev) => {
          const next = { ...prev };
          for (const p of res.items) {
            next[p.id] = { id: p.id, title: p.title, image_url: p.image_url };
          }
          return next;
        });
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.product_ids.join(",")]);

  async function runSearch() {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const byId = new Map<number, PickRow>();
      const asNum = Number.parseInt(q, 10);
      if (Number.isFinite(asNum) && asNum > 0 && String(asNum) === q) {
        const byIds = await fetchProducts(undefined, undefined, { ids: [asNum] });
        for (const p of byIds.items) {
          byId.set(p.id, { id: p.id, title: p.title, image_url: p.image_url });
        }
      }
      const pub = await fetchProducts(undefined, q, { limit: 24 });
      for (const p of pub.items as ProductSummary[]) {
        byId.set(p.id, { id: p.id, title: p.title, image_url: p.image_url });
      }
      setResults([...byId.values()].slice(0, 24));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function patch(partial: Partial<HomepageFeaturedConfig>) {
    onChange({ ...value, ...partial });
  }

  function addProduct(row: PickRow) {
    if (value.product_ids.includes(row.id)) return;
    if (value.product_ids.length >= 48) return;
    setSelectedMeta((prev) => ({ ...prev, [row.id]: row }));
    patch({ product_ids: [...value.product_ids, row.id], mode: "manual" });
  }

  function removeProduct(id: number) {
    patch({ product_ids: value.product_ids.filter((x) => x !== id) });
  }

  function moveProduct(id: number, dir: -1 | 1) {
    const ids = [...value.product_ids];
    const i = ids.indexOf(id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    patch({ product_ids: ids });
  }

  const flatCats = useMemo(() => flattenTree(categoryTree), [categoryTree]);
  const selectedCategoryName =
    value.category_id == null
      ? null
      : flatCats.find((c) => c.id === value.category_id)?.name_fa ?? `#${value.category_id}`;

  return (
    <div className="grid max-w-2xl gap-4">
      <label className="grid gap-1 text-sm">
        عنوان بخش
        <input
          className={inputClass}
          value={value.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
      </label>
      <label className="grid gap-1 text-sm">
        زیرعنوان
        <input
          className={inputClass}
          value={value.subtitle}
          onChange={(e) => patch({ subtitle: e.target.value })}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          متن لینک همه محصولات
          <input
            className={inputClass}
            value={value.catalog_label}
            onChange={(e) => patch({ catalog_label: e.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          آدرس لینک
          <input
            dir="ltr"
            className={inputClass}
            value={value.catalog_href}
            onChange={(e) => patch({ catalog_href: e.target.value })}
          />
        </label>
      </div>

      <fieldset className="grid gap-3 rounded-xl border border-theme p-4">
        <legend className="px-1 text-xs font-medium text-muted">منبع محصولات</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["latest", "جدیدترین‌ها"],
              ["manual", "انتخاب دستی"],
              ["category", "یک دسته"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition",
                value.mode === mode
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-theme text-muted hover:bg-[var(--bg-elevated)]",
              )}
              onClick={() => patch({ mode })}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="grid gap-1 text-sm">
          حداکثر تعداد نمایش ({value.product_count})
          <input
            type="range"
            min={1}
            max={24}
            step={1}
            value={value.product_count}
            onChange={(e) => patch({ product_count: Number(e.target.value) })}
          />
        </label>

        {value.mode === "latest" ? (
          <p className="text-xs text-muted">
            آخرین محصولات منتشرشده به ترتیب شناسه نمایش داده می‌شوند.
          </p>
        ) : null}

        {value.mode === "category" ? (
          <label className="grid gap-1 text-sm">
            دسته
            <select
              className={inputClass}
              value={value.category_id ?? ""}
              onChange={(e) =>
                patch({
                  category_id: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">انتخاب دسته…</option>
              {categoryOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            {selectedCategoryName ? (
              <span className="text-xs text-muted">محصولات «{selectedCategoryName}» و زیردسته‌هایش</span>
            ) : null}
          </label>
        ) : null}

        {value.mode === "manual" ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                className={inputClass}
                placeholder="جستجوی نام یا شناسه محصول…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void runSearch();
                  }
                }}
              />
              <Button type="button" variant="outline" disabled={searching} onClick={() => void runSearch()}>
                {searching ? "…" : "جستجو"}
              </Button>
            </div>
            {results.length ? (
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-theme p-2">
                {results.map((row) => {
                  const selected = value.product_ids.includes(row.id);
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        disabled={selected}
                        onClick={() => addProduct(row)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm transition",
                          selected
                            ? "opacity-40"
                            : "hover:bg-[var(--bg-elevated)]",
                        )}
                      >
                        {row.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.image_url} alt="" className="h-8 w-8 rounded object-cover" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded bg-[var(--bg-elevated)] text-xs text-muted">
                            —
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate">{row.title}</span>
                        <span className="text-xs text-muted">#{row.id}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            <div>
              <p className="mb-2 text-xs font-medium text-muted">
                انتخاب‌شده ({value.product_ids.length}) — ترتیب نمایش از بالا به پایین
              </p>
              {value.product_ids.length === 0 ? (
                <p className="text-sm text-muted">هنوز محصولی انتخاب نشده است.</p>
              ) : (
                <ul className="space-y-2">
                  {value.product_ids.map((id, index) => {
                    const meta = selectedMeta[id];
                    return (
                      <li
                        key={id}
                        className="flex items-center gap-2 rounded-xl border border-theme px-2 py-1.5"
                      >
                        {meta?.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={meta.image_url} alt="" className="h-9 w-9 rounded object-cover" />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded bg-[var(--bg-elevated)] text-xs text-muted">
                            {index + 1}
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {meta?.title ?? `محصول #${id}`}
                        </span>
                        <button
                          type="button"
                          className="px-1 text-xs text-muted disabled:opacity-30"
                          disabled={index === 0}
                          onClick={() => moveProduct(id, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="px-1 text-xs text-muted disabled:opacity-30"
                          disabled={index === value.product_ids.length - 1}
                          onClick={() => moveProduct(id, 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="px-2 text-xs text-red-600"
                          onClick={() => removeProduct(id)}
                        >
                          حذف
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </fieldset>
    </div>
  );
}

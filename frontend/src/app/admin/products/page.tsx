"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CategorySearchSelect } from "@/components/admin/CategorySearchSelect";
import { Check, ExternalLink, ImagePlus, Upload } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import {
  adminFetch,
  errorMessageFromResponse,
  type ProductAdmin,
} from "@/lib/api";
import { apiUrl } from "@/lib/api-base";
import {
  findNode,
  flattenTree,
  parentSelectOptions,
  type CategoryTreeNode,
} from "@/lib/category-tree";
import { cn, formatToman } from "@/lib/utils";

type StatusFilter =
  | "all"
  | "published"
  | "draft"
  | "low_stock"
  | "out_of_stock"
  | "unchecked"
  | "checked"
  | "image_mismatch";

type QuickBody = {
  base_price?: number;
  stock_quantity?: number;
  parent_category_id?: number;
  is_checked?: boolean;
  image_mismatch?: boolean;
  mark_out_of_stock?: boolean;
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;
const PAGE_SIZE_KEY = "selectbox_admin_products_page_size";

function readPageSize(): number {
  if (typeof window === "undefined") return 50;
  const raw = Number(localStorage.getItem(PAGE_SIZE_KEY));
  return PAGE_SIZE_OPTIONS.includes(raw as (typeof PAGE_SIZE_OPTIONS)[number]) ? raw : 50;
}

type BulkDeleteResult = {
  deleted: number[];
  failed: { id: number; reason: string }[];
  deleted_count: number;
};

export default function AdminProductsPage() {
  const [items, setItems] = useState<ProductAdmin[]>([]);
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const lastClickedIndex = useRef<number | null>(null);
  const headerCheckRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetId = useRef<number | null>(null);

  const token = () => localStorage.getItem("selectbox_admin_token")!;

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const q =
      categoryId != null
        ? `?category_id=${categoryId}&include_subtree=true`
        : "";
    Promise.all([
      adminFetch<ProductAdmin[]>(`/api/v1/admin/products${q}`, token()),
      adminFetch<CategoryTreeNode[]>("/api/v1/admin/categories/tree", token()).catch(
        () => [] as CategoryTreeNode[],
      ),
    ])
      .then(([rows, tree]) => {
        setItems(rows);
        setCategories(tree);
        setSelected(new Set());
        lastClickedIndex.current = null;
      })
      .catch((e) => {
        setItems([]);
        setError(e instanceof Error ? e.message : "خطا");
      })
      .finally(() => setLoading(false));
  }, [categoryId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPageSize(readPageSize());
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stock") === "low") setFilter("low_stock");
    if (params.get("filter") === "unchecked") setFilter("unchecked");
    if (params.get("filter") === "out_of_stock") setFilter("out_of_stock");
    if (params.get("filter") === "image_mismatch") setFilter("image_mismatch");
    const cat = params.get("category");
    if (cat && /^\d+$/.test(cat)) setCategoryId(Number(cat));
  }, []);

  const categoryLabel = useMemo(() => {
    if (categoryId == null) return null;
    return findNode(categories, categoryId)?.name_fa ?? `#${categoryId}`;
  }, [categories, categoryId]);

  const flatCategories = useMemo(() => flattenTree(categories), [categories]);

  const categoryOptions = useMemo(
    () =>
      parentSelectOptions(categories, new Set()).map((o) => {
        const node = findNode(categories, o.id);
        return {
          id: o.id,
          label: o.label,
          name_fa: node?.name_fa,
          slug: node?.slug,
        };
      }),
    [categories],
  );

  const filtered = useMemo(() => {
    let rows = items;
    if (filter === "published") rows = rows.filter((p) => p.status === "published");
    if (filter === "draft") rows = rows.filter((p) => p.status === "draft");
    if (filter === "low_stock") {
      rows = rows.filter((p) => {
        const s = p.stock_quantity ?? 0;
        return s > 0 && s <= 3;
      });
    }
    if (filter === "out_of_stock") rows = rows.filter((p) => (p.stock_quantity ?? 0) < 1);
    if (filter === "unchecked") rows = rows.filter((p) => !p.is_checked);
    if (filter === "checked") rows = rows.filter((p) => !!p.is_checked);
    if (filter === "image_mismatch") rows = rows.filter((p) => !!p.image_mismatch);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.category_name_fa || "").toLowerCase().includes(q),
      );
    }
    return rows;
  }, [items, filter, search]);

  useEffect(() => {
    setPage(1);
  }, [filter, search, categoryId, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  function changePageSize(n: number) {
    setPageSize(n);
    localStorage.setItem(PAGE_SIZE_KEY, String(n));
  }

  const selectedInView = useMemo(
    () => pageSlice.filter((p) => selected.has(p.id)).length,
    [pageSlice, selected],
  );
  const allFilteredSelected =
    pageSlice.length > 0 && selectedInView === pageSlice.length;
  const someFilteredSelected = selectedInView > 0 && !allFilteredSelected;

  useEffect(() => {
    if (headerCheckRef.current) {
      headerCheckRef.current.indeterminate = someFilteredSelected;
    }
  }, [someFilteredSelected]);

  function patchLocal(updated: ProductAdmin) {
    setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function quickSave(id: number, body: QuickBody) {
    setSavingId(id);
    try {
      const updated = await adminFetch<ProductAdmin>(
        `/api/v1/admin/products/${id}/quick`,
        token(),
        { method: "PATCH", body: JSON.stringify(body) },
      );
      patchLocal(updated);
    } catch (e) {
      alert(e instanceof Error ? e.message : "ذخیره ناموفق بود");
      load();
    } finally {
      setSavingId(null);
    }
  }

  function selectIds(ids: number[], mode: "add" | "set" | "toggle" = "add") {
    setSelected((prev) => {
      if (mode === "set") return new Set(ids);
      const next = new Set(prev);
      if (mode === "toggle") {
        for (const id of ids) {
          if (next.has(id)) next.delete(id);
          else next.add(id);
        }
        return next;
      }
      for (const id of ids) next.add(id);
      return next;
    });
  }

  function toggleOne(id: number, index: number, shiftKey: boolean) {
    if (shiftKey && lastClickedIndex.current != null) {
      const from = Math.min(lastClickedIndex.current, index);
      const to = Math.max(lastClickedIndex.current, index);
      selectIds(pageSlice.slice(from, to + 1).map((p) => p.id), "add");
    } else {
      selectIds([id], "toggle");
      lastClickedIndex.current = index;
    }
  }

  function toggleAllOnPage() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        pageSlice.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      selectIds(
        pageSlice.map((p) => p.id),
        "add",
      );
    }
  }

  function selectAllFiltered() {
    selectIds(
      filtered.map((p) => p.id),
      "set",
    );
  }

  function clearSelection() {
    setSelected(new Set());
    lastClickedIndex.current = null;
  }

  function pickImage(productId: number) {
    uploadTargetId.current = productId;
    fileInputRef.current?.click();
  }

  async function onImagePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const productId = uploadTargetId.current;
    e.target.value = "";
    if (!file || productId == null) return;
    setSavingId(productId);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("as_primary", "true");
    try {
      const res = await fetch(apiUrl(`/api/v1/admin/products/${productId}/images`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      if (!res.ok) throw new Error(await errorMessageFromResponse(res));
      const img = (await res.json()) as { url: string };
      setItems((prev) =>
        prev.map((p) =>
          p.id === productId
            ? {
                ...p,
                thumbnail_url: img.url,
                image_count: Math.max(1, (p.image_count || 0) + 1),
              }
            : p,
        ),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "آپلود ناموفق بود");
    } finally {
      setSavingId(null);
      uploadTargetId.current = null;
    }
  }

  async function remove(id: number) {
    if (!confirm("حذف این محصول؟")) return;
    setBusy(true);
    try {
      await adminFetch(`/api/v1/admin/products/${id}`, token(), { method: "DELETE" });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "حذف ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  async function removeSelected() {
    const ids = [...selected];
    if (!ids.length) return;
    if (!confirm(`حذف ${ids.length} محصول انتخاب‌شده؟`)) return;
    setBusy(true);
    try {
      const res = await adminFetch<BulkDeleteResult>("/api/v1/admin/products/bulk-delete", token(), {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
      if (res.failed.length) {
        const lines = res.failed
          .slice(0, 8)
          .map((f) => `#${f.id}: ${f.reason}`)
          .join("\n");
        alert(
          `${res.deleted_count} حذف شد، ${res.failed.length} ناموفق:\n${lines}${
            res.failed.length > 8 ? "\n…" : ""
          }`,
        );
      }
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "حذف گروهی ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  async function enrichSelected(mode: "images" | "description" | "both" | "category") {
    const ids = [...selected];
    if (!ids.length) return;
    const labels = {
      images: "جستجوی عکس از وب",
      description: "کرال توضیح از وب",
      both: "جستجوی عکس و توضیح از وب",
      category: "دسته‌بندی خودکار",
    } as const;
    if (
      !confirm(
        `برای ${ids.length} محصول، ${labels[mode]} در صف قرار بگیرد؟`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const chunkSize = 200;
      let queued = 0;
      let skipped = 0;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const res = await adminFetch<{ queued: number; skipped: number }>(
          "/api/v1/admin/enrichment/enqueue",
          token(),
          {
            method: "POST",
            body: JSON.stringify({ product_ids: chunk, auto_apply: true, mode }),
          },
        );
        queued += res.queued;
        skipped += res.skipped;
      }
      alert(`${queued} در صف · ${skipped} رد شد`);
      window.location.href = "/admin/enrichment";
    } catch (e) {
      alert(e instanceof Error ? e.message : "صف‌کردن ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  async function markSelectedChecked(value: boolean) {
    const ids = [...selected];
    if (!ids.length) return;
    setBusy(true);
    try {
      for (const id of ids) {
        await adminFetch(`/api/v1/admin/products/${id}/quick`, token(), {
          method: "PATCH",
          body: JSON.stringify({ is_checked: value }),
        });
      }
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(p: ProductAdmin) {
    const next = p.status === "published" ? "draft" : "published";
    if (next === "published" && p.image_count < 1) {
      alert("برای انتشار حداقل یک تصویر لازم است.");
      return;
    }
    try {
      await adminFetch(`/api/v1/admin/products/${p.id}/status`, token(), {
        method: "PATCH",
        body: JSON.stringify({
          status: next,
          ...(next === "published" && p.variation_count < 1 ? { stock_quantity: 10 } : {}),
        }),
      });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطا در تغییر وضعیت");
    }
  }

  function setCategoryFilter(id: number | null) {
    setCategoryId(id);
    const url = new URL(window.location.href);
    if (id == null) url.searchParams.delete("category");
    else url.searchParams.set("category", String(id));
    window.history.replaceState({}, "", url.pathname + url.search);
  }

  const counts = useMemo(
    () => ({
      all: items.length,
      published: items.filter((p) => p.status === "published").length,
      draft: items.filter((p) => p.status === "draft").length,
      low_stock: items.filter((p) => {
        const s = p.stock_quantity ?? 0;
        return s > 0 && s <= 3;
      }).length,
      out_of_stock: items.filter((p) => (p.stock_quantity ?? 0) < 1).length,
      unchecked: items.filter((p) => !p.is_checked).length,
      checked: items.filter((p) => !!p.is_checked).length,
      image_mismatch: items.filter((p) => !!p.image_mismatch).length,
    }),
    [items],
  );

  const filterChips: { key: StatusFilter; label: string }[] = [
    { key: "all", label: `همه (${counts.all})` },
    { key: "unchecked", label: `چک‌نشده (${counts.unchecked})` },
    { key: "checked", label: `چک‌شده (${counts.checked})` },
    { key: "image_mismatch", label: `مغایرت عکس (${counts.image_mismatch})` },
    { key: "out_of_stock", label: `ناموجود (${counts.out_of_stock})` },
    { key: "low_stock", label: `کم‌موجود (${counts.low_stock})` },
    { key: "published", label: `منتشر (${counts.published})` },
    { key: "draft", label: `پیش‌نویس (${counts.draft})` },
  ];

  return (
    <div className="pb-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onImagePicked}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold sm:text-3xl">محصولات</h1>
          <p className="mt-1 text-sm text-muted">
            ویرایش سریع قیمت، موجودی و عکس — بدون ورود به فرم کامل
            {categoryLabel ? (
              <>
                {" "}
                · دسته: <span className="text-[var(--fg)]">{categoryLabel}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/enrichment">
            <Button variant="ghost" size="sm">
              غنی‌سازی
            </Button>
          </Link>
          <Link href="/admin/products/new">
            <Button size="sm">محصول جدید</Button>
          </Link>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          className="input-theme w-full sm:max-w-xs"
          placeholder="جستجو عنوان، اسلاگ، دسته..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input-theme w-full sm:max-w-[220px]"
          value={categoryId ?? ""}
          onChange={(e) =>
            setCategoryFilter(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">همه دسته‌ها</option>
          {flatCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_fa}
              {typeof c.product_count_subtree === "number"
                ? ` (${c.product_count_subtree})`
                : ""}
            </option>
          ))}
        </select>
        {categoryId != null ? (
          <Button size="sm" variant="ghost" onClick={() => setCategoryFilter(null)}>
            حذف فیلتر دسته
          </Button>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filterChips.map((f) => (
          <button
            key={f.key}
            type="button"
            className={cn("chip-theme shrink-0 whitespace-nowrap", filter === f.key && "is-active")}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {selected.size > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-theme bg-card p-3 text-sm">
          <span className="font-medium">{selected.size.toLocaleString("fa-IR")} انتخاب</span>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => markSelectedChecked(true)}>
            علامت چک
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => markSelectedChecked(false)}>
            برداشتن چک
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => enrichSelected("images")}>
            عکس وب
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => enrichSelected("description")}>
            توضیح وب
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={removeSelected}>
            حذف
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            لغو
          </Button>
          <Button size="sm" variant="ghost" className="ms-auto hidden sm:inline-flex" onClick={selectAllFiltered}>
            همهٔ فیلتر ({filtered.length.toLocaleString("fa-IR")})
          </Button>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="mt-8 text-muted">در حال بارگذاری...</p> : null}

      {!loading && filtered.length > 0 ? (
        <PaginationBar
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          total={filtered.length}
          onPage={setPage}
          onPageSize={changePageSize}
        />
      ) : null}

      {/* موبایل: کارت */}
      <div className="mt-5 space-y-3 md:hidden">
        {pageSlice.map((p, index) => (
          <ProductMobileCard
            key={p.id}
            p={p}
            selected={selected.has(p.id)}
            saving={savingId === p.id}
            categoryOptions={categoryOptions}
            onToggleSelect={() => toggleOne(p.id, index, false)}
            onQuickSave={quickSave}
            onPickImage={() => pickImage(p.id)}
            onToggleStatus={() => toggleStatus(p)}
            onRemove={() => remove(p.id)}
            busy={busy}
          />
        ))}
        {!loading && filtered.length === 0 ? (
          <p className="py-10 text-center text-muted">محصولی یافت نشد</p>
        ) : null}
      </div>

      {/* دسکتاپ: جدول */}
      <div className="card-theme mt-6 hidden overflow-visible md:block">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="border-b border-theme text-muted">
            <tr>
              <th className="w-10 p-3 text-right">
                <input
                  ref={headerCheckRef}
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
                  checked={allFilteredSelected}
                  onChange={toggleAllOnPage}
                  aria-label="انتخاب صفحه"
                  disabled={!pageSlice.length}
                />
              </th>
              <th className="w-14 p-3 text-right">عکس</th>
              <th className="p-3 text-right">محصول</th>
              <th className="w-52 p-3 text-right">دسته</th>
              <th className="w-36 p-3 text-right">قیمت</th>
              <th className="w-40 p-3 text-right">موجودی</th>
              <th className="w-20 p-3 text-center">چک</th>
              <th className="w-28 p-3 text-center">مغایرت عکس</th>
              <th className="w-24 p-3 text-right">وضعیت</th>
              <th className="w-44 p-3" />
            </tr>
          </thead>
          <tbody>
            {pageSlice.map((p, index) => {
              const isOn = selected.has(p.id);
              const stock = p.stock_quantity ?? 0;
              const oos = stock < 1;
              return (
                <tr
                  key={p.id}
                  className={cn(
                    "border-b border-theme transition-colors",
                    isOn ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-elevated)]",
                    oos && !isOn && "bg-red-500/[0.03]",
                    p.image_mismatch && !isOn && "bg-amber-500/[0.04]",
                  )}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
                      checked={isOn}
                      onChange={(e) =>
                        toggleOne(p.id, index, (e.nativeEvent as MouseEvent).shiftKey)
                      }
                      aria-label={`انتخاب ${p.title}`}
                    />
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      className="group relative h-14 w-14 overflow-hidden rounded-lg border border-theme bg-surface"
                      title="تعویض عکس اصلی"
                      disabled={savingId === p.id}
                      onClick={() => pickImage(p.id)}
                    >
                      {p.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.thumbnail_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-muted">
                          <ImagePlus className="h-5 w-5" />
                        </span>
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
                        <Upload className="h-4 w-4 text-white" />
                      </span>
                    </button>
                  </td>
                  <td className="p-3">
                    <p className="max-w-[240px] truncate font-medium" title={p.title}>
                      {p.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {p.image_count < 1 ? "بدون عکس" : `${p.image_count} عکس`}
                      {!(p.description || "").trim() ? " · بدون توضیح" : ""}
                    </p>
                  </td>
                  <td className="p-3">
                    <CategorySearchSelect
                      value={p.parent_category_id}
                      label={p.category_name_fa}
                      options={categoryOptions}
                      disabled={savingId === p.id}
                      onChange={(id) => quickSave(p.id, { parent_category_id: id })}
                    />
                  </td>
                  <td className="p-3">
                    <PriceInput
                      value={p.base_price}
                      disabled={savingId === p.id}
                      onCommit={(n) => quickSave(p.id, { base_price: n })}
                    />
                    <p className="mt-0.5 text-[10px] text-muted">{formatToman(p.base_price)}</p>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <StockInput
                        value={stock}
                        disabled={savingId === p.id}
                        oos={oos}
                        onCommit={(n) => quickSave(p.id, { stock_quantity: n })}
                      />
                      <button
                        type="button"
                        className={cn(
                          "rounded-lg border px-2 py-1.5 text-[11px] transition",
                          oos
                            ? "border-red-500/40 bg-red-500/10 text-red-600"
                            : "border-theme text-muted hover:border-red-500/40 hover:text-red-600",
                        )}
                        disabled={savingId === p.id || oos}
                        title="ناموجود کردن"
                        onClick={() => quickSave(p.id, { mark_out_of_stock: true })}
                      >
                        ناموجود
                      </button>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      className={cn(
                        "inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
                        p.is_checked
                          ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600"
                          : "border-theme text-muted hover:border-[var(--accent)]/40 hover:text-[var(--fg)]",
                      )}
                      title={p.is_checked ? "برداشتن چک" : "تأیید چک اولیه"}
                      disabled={savingId === p.id}
                      onClick={() => quickSave(p.id, { is_checked: !p.is_checked })}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-amber-600"
                        checked={!!p.image_mismatch}
                        disabled={savingId === p.id}
                        onChange={() =>
                          quickSave(p.id, { image_mismatch: !p.image_mismatch })
                        }
                        aria-label="مغایرت عکس"
                      />
                      <span className={p.image_mismatch ? "font-medium text-amber-700" : "text-muted"}>
                        {p.image_mismatch ? "بله" : "—"}
                      </span>
                    </label>
                  </td>
                  <td className="p-3">
                    <span className={p.status === "published" ? "text-green-600" : "text-amber-600"}>
                      {p.status === "published" ? "منتشر" : "پیش‌نویس"}
                    </span>
                    {oos ? (
                      <p className="text-[10px] font-medium text-red-500">ناموجود</p>
                    ) : null}
                    {p.image_mismatch ? (
                      <p className="text-[10px] font-medium text-amber-700">مغایرت عکس</p>
                    ) : null}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Link href={`/admin/products/${p.id}/edit`}>
                        <Button size="sm" variant="outline">
                          جزئیات
                        </Button>
                      </Link>
                      {p.status === "published" ? (
                        <Link href={`/product/${p.slug}`} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="ghost">
                            <ExternalLink size={14} />
                          </Button>
                        </Link>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={p.status !== "published" && p.image_count < 1}
                        onClick={() => toggleStatus(p)}
                      >
                        {p.status === "published" ? "پیش‌نویس" : "انتشار"}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => remove(p.id)}>
                        حذف
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {!loading && filtered.length === 0 ? (
          <p className="p-8 text-center text-muted">محصولی یافت نشد</p>
        ) : null}
      </div>

      {!loading && filtered.length > 0 ? (
        <PaginationBar
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          total={filtered.length}
          onPage={setPage}
          onPageSize={changePageSize}
        />
      ) : null}
    </div>
  );
}

function PaginationBar({
  page,
  totalPages,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPage: (n: number) => void;
  onPageSize: (n: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-theme bg-card px-3 py-2.5 text-sm">
      <p className="text-muted">
        {from.toLocaleString("fa-IR")}–{to.toLocaleString("fa-IR")} از{" "}
        {total.toLocaleString("fa-IR")}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted">
          در هر صفحه
          <select
            className="input-theme px-2 py-1 text-sm"
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n.toLocaleString("fa-IR")}
              </option>
            ))}
          </select>
        </label>
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(1)}>
          اول
        </Button>
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          قبلی
        </Button>
        <span className="min-w-[5.5rem] text-center tabular-nums">
          {page.toLocaleString("fa-IR")} / {totalPages.toLocaleString("fa-IR")}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          بعدی
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPage(totalPages)}
        >
          آخر
        </Button>
      </div>
    </div>
  );
}

function PriceInput({
  value,
  disabled,
  onCommit,
}: {
  value: string;
  disabled?: boolean;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState(String(Math.round(Number(value) || 0)));
  useEffect(() => {
    setDraft(String(Math.round(Number(value) || 0)));
  }, [value]);

  function commit() {
    const n = Number(draft.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(n) || n < 0) {
      setDraft(String(Math.round(Number(value) || 0)));
      return;
    }
    if (n === Number(value)) return;
    onCommit(n);
  }

  return (
    <input
      className="input-theme w-full max-w-[8.5rem] px-2 py-1.5 text-sm tabular-nums"
      inputMode="numeric"
      disabled={disabled}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      aria-label="قیمت"
    />
  );
}

function StockInput({
  value,
  disabled,
  oos,
  onCommit,
}: {
  value: number;
  disabled?: boolean;
  oos?: boolean;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit() {
    const n = Number.parseInt(draft.replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(n) || n < 0) {
      setDraft(String(value));
      return;
    }
    if (n === value) return;
    onCommit(n);
  }

  return (
    <input
      className={cn(
        "input-theme w-16 px-2 py-1.5 text-center text-sm tabular-nums",
        oos && "border-red-500/40 text-red-600",
      )}
      inputMode="numeric"
      disabled={disabled}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      aria-label="موجودی"
    />
  );
}

function ProductMobileCard({
  p,
  selected,
  saving,
  categoryOptions,
  onToggleSelect,
  onQuickSave,
  onPickImage,
  onToggleStatus,
  onRemove,
  busy,
}: {
  p: ProductAdmin;
  selected: boolean;
  saving: boolean;
  categoryOptions: { id: number; label: string; name_fa?: string; slug?: string }[];
  onToggleSelect: () => void;
  onQuickSave: (id: number, body: QuickBody) => void;
  onPickImage: () => void;
  onToggleStatus: () => void;
  onRemove: () => void;
  busy: boolean;
}) {
  const stock = p.stock_quantity ?? 0;
  const oos = stock < 1;

  return (
    <article
      className={cn(
        "rounded-2xl border border-theme bg-card p-3",
        selected && "border-[var(--accent)]/50 bg-[var(--accent-soft)]",
        oos && "border-red-500/25",
        p.image_mismatch && "border-amber-500/30",
      )}
    >
      <div className="flex gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={`انتخاب ${p.title}`}
        />
        <button
          type="button"
          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-theme bg-surface"
          onClick={onPickImage}
          disabled={saving}
          title="تعویض عکس"
        >
          {p.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.thumbnail_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-muted">
              <ImagePlus className="h-5 w-5" />
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug">{p.title}</p>
          <div className="mt-2">
            <CategorySearchSelect
              value={p.parent_category_id}
              label={p.category_name_fa}
              options={categoryOptions}
              disabled={saving}
              onChange={(id) => onQuickSave(p.id, { parent_category_id: id })}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full border",
                p.is_checked
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600"
                  : "border-theme text-muted",
              )}
              disabled={saving}
              onClick={() => onQuickSave(p.id, { is_checked: !p.is_checked })}
              aria-label="چک"
            >
              <Check className="h-4 w-4" />
            </button>
            <label className="inline-flex items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                className="h-4 w-4 accent-amber-600"
                checked={!!p.image_mismatch}
                disabled={saving}
                onChange={() =>
                  onQuickSave(p.id, { image_mismatch: !p.image_mismatch })
                }
              />
              مغایرت عکس
            </label>
            <span
              className={cn(
                "text-xs",
                p.status === "published" ? "text-green-600" : "text-amber-600",
              )}
            >
              {p.status === "published" ? "منتشر" : "پیش‌نویس"}
              {oos ? " · ناموجود" : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block text-[11px] text-muted">
          قیمت
          <PriceInput
            value={p.base_price}
            disabled={saving}
            onCommit={(n) => onQuickSave(p.id, { base_price: n })}
          />
        </label>
        <label className="block text-[11px] text-muted">
          موجودی
          <div className="mt-0 flex items-center gap-1">
            <StockInput
              value={stock}
              disabled={saving}
              oos={oos}
              onCommit={(n) => onQuickSave(p.id, { stock_quantity: n })}
            />
            <button
              type="button"
              className={cn(
                "rounded-lg border px-2 py-1.5 text-[11px]",
                oos
                  ? "border-red-500/40 bg-red-500/10 text-red-600"
                  : "border-theme text-muted",
              )}
              disabled={saving || oos}
              onClick={() => onQuickSave(p.id, { mark_out_of_stock: true })}
            >
              ناموجود
            </button>
          </div>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Link href={`/admin/products/${p.id}/edit`} className="flex-1">
          <Button size="sm" variant="outline" className="w-full">
            جزئیات
          </Button>
        </Link>
        {p.status === "published" ? (
          <Link href={`/product/${p.slug}`} target="_blank" rel="noreferrer">
            <Button size="sm" variant="ghost">
              <ExternalLink size={14} />
            </Button>
          </Link>
        ) : null}
        <Button size="sm" variant="ghost" onClick={onToggleStatus}>
          {p.status === "published" ? "پیش‌نویس" : "انتشار"}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onRemove}>
          حذف
        </Button>
      </div>
    </article>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ExternalLink } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { adminFetch, type ProductAdmin } from "@/lib/api";
import { cn, formatToman } from "@/lib/utils";

type StatusFilter = "all" | "published" | "draft";

type BulkDeleteResult = {
  deleted: number[];
  failed: { id: number; reason: string }[];
  deleted_count: number;
};

export default function AdminProductsPage() {
  const [items, setItems] = useState<ProductAdmin[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const lastClickedIndex = useRef<number | null>(null);
  const headerCheckRef = useRef<HTMLInputElement>(null);

  const token = () => localStorage.getItem("selectbox_admin_token")!;

  const load = () => {
    setLoading(true);
    setError(null);
    adminFetch<ProductAdmin[]>("/api/v1/admin/products", token())
      .then((rows) => {
        setItems(rows);
        setSelected(new Set());
        lastClickedIndex.current = null;
      })
      .catch((e) => {
        setItems([]);
        setError(e instanceof Error ? e.message : "خطا");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let rows = items;
    if (filter === "published") rows = rows.filter((p) => p.status === "published");
    if (filter === "draft") rows = rows.filter((p) => p.status === "draft");
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [items, filter, search]);

  const selectedInView = useMemo(
    () => filtered.filter((p) => selected.has(p.id)).length,
    [filtered, selected],
  );
  const allFilteredSelected =
    filtered.length > 0 && selectedInView === filtered.length;
  const someFilteredSelected = selectedInView > 0 && !allFilteredSelected;

  useEffect(() => {
    if (headerCheckRef.current) {
      headerCheckRef.current.indeterminate = someFilteredSelected;
    }
  }, [someFilteredSelected]);

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
      const rangeIds = filtered.slice(from, to + 1).map((p) => p.id);
      selectIds(rangeIds, "add");
    } else {
      selectIds([id], "toggle");
      lastClickedIndex.current = index;
    }
  }

  function toggleAllFiltered() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      selectIds(
        filtered.map((p) => p.id),
        "add",
      );
    }
  }

  function selectFirstN(n: number) {
    selectIds(
      filtered.slice(0, n).map((p) => p.id),
      "set",
    );
    lastClickedIndex.current = Math.min(n, filtered.length) - 1;
  }

  function clearSelection() {
    setSelected(new Set());
    lastClickedIndex.current = null;
  }

  function selectMissing(kind: "image" | "description") {
    const ids = filtered
      .filter((p) =>
        kind === "image"
          ? (p.image_count ?? 0) < 1
          : !(p.description || "").trim(),
      )
      .map((p) => p.id);
    if (!ids.length) {
      alert(
        kind === "image"
          ? "محصول بدون عکس در این لیست نیست."
          : "محصول بدون توضیح در این لیست نیست.",
      );
      return;
    }
    selectIds(ids, "set");
    lastClickedIndex.current = null;
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
      description: "کرال توضیح از وب (دیجی‌کالا/ترب + AvalAI)",
      both: "جستجوی عکس و توضیح از وب",
      category: "دسته‌بندی خودکار بر اساس نام (در صورت نیاز دسته جدید ساخته می‌شود)",
    } as const;
    if (
      !confirm(
        `برای ${ids.length} محصول انتخاب‌شده، ${labels[mode]} در صف سرور قرار بگیرد؟\nپنل گیر نمی‌کند؛ نتیجه در «غنی‌سازی» و روی خود محصول می‌آید.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      // صف را تکه‌تکه می‌فرستیم تا سقف API گیر نکند
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
      alert(`${queued} در صف · ${skipped} رد شد (قبلاً در صف بود یا نامعتبر)`);
      window.location.href = "/admin/enrichment";
    } catch (e) {
      alert(e instanceof Error ? e.message : "صف‌کردن ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(p: ProductAdmin) {
    const next = p.status === "published" ? "draft" : "published";
    if (next === "published") {
      if (p.image_count < 1) {
        alert("برای انتشار، ابتدا از ویرایش محصول حداقل یک تصویر آپلود کنید.");
        return;
      }
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

  const counts = useMemo(
    () => ({
      all: items.length,
      published: items.filter((p) => p.status === "published").length,
      draft: items.filter((p) => p.status === "draft").length,
    }),
    [items],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">محصولات</h1>
          <p className="mt-2 text-sm text-muted">
            {counts.published} منتشر · {counts.draft} پیش‌نویس
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selected.size > 0 ? (
            <>
              <Button variant="outline" disabled={busy} onClick={() => enrichSelected("images")}>
                دریافت عکس از وب ({selected.size})
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => enrichSelected("description")}>
                کرال توضیح از وب ({selected.size})
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => enrichSelected("both")}>
                عکس + توضیح ({selected.size})
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => enrichSelected("category")}>
                دسته‌بندی خودکار ({selected.size})
              </Button>
              <Button variant="outline" disabled={busy} onClick={removeSelected}>
                حذف انتخاب‌شده ({selected.size})
              </Button>
            </>
          ) : null}
          <Link href="/admin/enrichment">
            <Button variant="ghost">صف غنی‌سازی</Button>
          </Link>
          <Link href="/admin/products/new">
            <Button>محصول جدید</Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          className="input-theme max-w-xs"
          placeholder="جستجو عنوان یا اسلاگ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {(["all", "published", "draft"] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={cn("chip-theme", filter === f && "is-active")}
            onClick={() => setFilter(f)}
          >
            {f === "all"
              ? `همه (${counts.all})`
              : f === "published"
                ? `منتشر (${counts.published})`
                : `پیش‌نویس (${counts.draft})`}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-theme bg-card p-3 text-sm">
        <span className="text-muted">
          انتخاب:{" "}
          <span className="font-medium text-[var(--fg)]">
            {selected.size.toLocaleString("fa-IR")}
          </span>
          {filtered.length ? (
            <span className="text-muted">
              {" "}
              از {filtered.length.toLocaleString("fa-IR")} ردیف
            </span>
          ) : null}
        </span>
        <span className="hidden text-muted sm:inline">·</span>
        <Button size="sm" variant="outline" disabled={!filtered.length} onClick={toggleAllFiltered}>
          {allFilteredSelected ? "لغو همهٔ لیست" : "همهٔ لیست فعلی"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={filtered.length < 1}
          onClick={() => selectFirstN(50)}
        >
          ۵۰ اول
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={filtered.length < 1}
          onClick={() => selectFirstN(100)}
        >
          ۱۰۰ اول
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!filtered.length}
          onClick={() => selectMissing("image")}
        >
          بدون عکس
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!filtered.length}
          onClick={() => selectMissing("description")}
        >
          بدون توضیح
        </Button>
        <Button size="sm" variant="ghost" disabled={selected.size === 0} onClick={clearSelection}>
          پاک کردن
        </Button>
        <p className="w-full text-[11px] text-muted sm:w-auto sm:ms-auto">
          Shift + کلیک روی ردیف = انتخاب بازه
        </p>
      </div>

      {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="mt-8 text-muted">در حال بارگذاری...</p> : null}

      <div className="card-theme mt-6 overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b border-theme text-muted">
            <tr>
              <th className="w-12 p-4 text-right">
                <input
                  ref={headerCheckRef}
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
                  checked={allFilteredSelected}
                  onChange={toggleAllFiltered}
                  aria-label="انتخاب همه"
                  disabled={!filtered.length}
                />
              </th>
              <th className="p-4 text-right">تصویر</th>
              <th className="p-4 text-right">عنوان</th>
              <th className="p-4 text-right">اسلاگ</th>
              <th className="p-4 text-right">قیمت</th>
              <th className="p-4 text-right">تنوع / عکس</th>
              <th className="p-4 text-right">وضعیت</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, index) => {
              const isOn = selected.has(p.id);
              return (
                <tr
                  key={p.id}
                  className={cn(
                    "border-b border-theme transition-colors",
                    isOn ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-elevated)]",
                  )}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest("a, button, input, label")) return;
                    toggleOne(p.id, index, e.shiftKey);
                  }}
                >
                  <td className="p-4">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
                      checked={isOn}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        toggleOne(p.id, index, (e.nativeEvent as MouseEvent).shiftKey)
                      }
                      aria-label={`انتخاب ${p.title}`}
                    />
                  </td>
                  <td className="p-4">
                    {p.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumbnail_url} alt="" className="h-12 w-10 object-cover" />
                    ) : (
                      <div className="flex h-12 w-10 items-center justify-center bg-surface text-xs text-muted">
                        —
                      </div>
                    )}
                  </td>
                  <td className="p-4 font-medium">{p.title}</td>
                  <td className="p-4 font-mono text-xs text-muted">{p.slug}</td>
                  <td className="p-4">{formatToman(p.base_price)}</td>
                  <td className="p-4 text-xs text-muted">
                    {p.variation_count ?? 0} تنوع · {p.image_count} عکس
                    {!(p.description || "").trim() ? " · بدون توضیح" : ""}
                  </td>
                  <td className="p-4">
                    <span className={p.status === "published" ? "text-green-500" : "text-amber-500"}>
                      {p.status === "published" ? "منتشر" : "پیش‌نویس"}
                    </span>
                    {p.published_at ? (
                      <p className="text-[10px] text-muted">
                        {new Intl.DateTimeFormat("fa-IR").format(new Date(p.published_at))}
                      </p>
                    ) : null}
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/products/${p.id}/edit`}>
                        <Button size="sm" variant="outline">
                          ویرایش
                        </Button>
                      </Link>
                      {p.status === "published" ? (
                        <Link href={`/product/${p.slug}`} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="ghost">
                            <ExternalLink size={14} className="me-1" />
                            فروشگاه
                          </Button>
                        </Link>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={p.status !== "published" && p.image_count < 1}
                        title={
                          p.status !== "published" && p.image_count < 1
                            ? "ابتدا تصویر اضافه کنید"
                            : undefined
                        }
                        onClick={() => toggleStatus(p)}
                      >
                        {p.status === "published" ? "پیش‌نویس" : "انتشار"}
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => remove(p.id)}>
                        حذف
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && filtered.length === 0 ? (
          <p className="p-8 text-center text-muted">محصولی یافت نشد</p>
        ) : null}
      </div>
    </div>
  );
}

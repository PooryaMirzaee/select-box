"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ExternalLink } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { adminFetch, type ProductAdmin } from "@/lib/api";
import { cn, formatToman } from "@/lib/utils";

type StatusFilter = "all" | "published" | "draft";

export default function AdminProductsPage() {
  const [items, setItems] = useState<ProductAdmin[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = () => localStorage.getItem("coralay_admin_token")!;

  const load = () => {
    setLoading(true);
    setError(null);
    adminFetch<ProductAdmin[]>("/api/v1/admin/products", token())
      .then(setItems)
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

  async function remove(id: number) {
    if (!confirm("حذف محصول؟")) return;
    await adminFetch(`/api/v1/admin/products/${id}`, token(), { method: "DELETE" });
    load();
  }

  async function toggleStatus(p: ProductAdmin) {
    const next = p.status === "published" ? "draft" : "published";
    try {
      await adminFetch(`/api/v1/admin/products/${p.id}/status`, token(), {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
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
        <Link href="/admin/products/new">
          <Button>محصول جدید</Button>
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
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
            {f === "all" ? `همه (${counts.all})` : f === "published" ? `منتشر (${counts.published})` : `پیش‌نویس (${counts.draft})`}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="mt-8 text-muted">در حال بارگذاری...</p> : null}

      <div className="card-theme mt-6 overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-theme text-muted">
            <tr>
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
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-theme">
                <td className="p-4">
                  {p.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbnail_url} alt="" className="h-12 w-10 object-cover" />
                  ) : (
                    <div className="flex h-12 w-10 items-center justify-center bg-surface text-xs text-muted">—</div>
                  )}
                </td>
                <td className="p-4 font-medium">{p.title}</td>
                <td className="p-4 font-mono text-xs text-muted">{p.slug}</td>
                <td className="p-4">{formatToman(p.base_price)}</td>
                <td className="p-4 text-xs text-muted">
                  {p.variation_count ?? 0} تنوع · {p.image_count} عکس
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
                <td className="p-4">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/products/${p.id}/edit`}>
                      <Button size="sm" variant="outline">ویرایش</Button>
                    </Link>
                    {p.status === "published" ? (
                      <Link href={`/product/${p.slug}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="ghost">
                          <ExternalLink size={14} className="me-1" />
                          فروشگاه
                        </Button>
                      </Link>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(p)}>
                      {p.status === "published" ? "پیش‌نویس" : "انتشار"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(p.id)}>
                      حذف
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 ? (
          <p className="p-8 text-center text-muted">محصولی یافت نشد</p>
        ) : null}
      </div>
    </div>
  );
}

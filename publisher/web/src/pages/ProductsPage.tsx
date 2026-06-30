import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Product } from "../lib/api";
import { StatusBadge } from "../lib/StatusBadge";
import { formatPrice } from "../lib/utils";

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    api
      .products(filter === "all" ? undefined : filter)
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">محصولات</h1>
        <button
          onClick={load}
          className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          بروزرسانی
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {[
          { key: "all", label: "همه" },
          { key: "published", label: "منتشر شده" },
          { key: "draft", label: "پیش‌نویس" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === f.key
                ? "bg-[var(--color-brand)] text-white"
                : "bg-white border border-[var(--color-border)] hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm mb-4">{error}</div>
      )}

      {loading ? (
        <p className="text-[var(--color-muted)]">در حال بارگذاری...</p>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[var(--color-muted)]">
              <tr>
                <th className="text-right p-3 font-medium">#</th>
                <th className="text-right p-3 font-medium">عنوان</th>
                <th className="text-right p-3 font-medium">قیمت</th>
                <th className="text-right p-3 font-medium">وضعیت</th>
                <th className="text-right p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-[var(--color-border)]">
                  <td className="p-3 text-[var(--color-muted)]">{p.id}</td>
                  <td className="p-3">
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-[var(--color-muted)]">{p.slug}</div>
                  </td>
                  <td className="p-3">{formatPrice(p.base_price)}</td>
                  <td className="p-3"><StatusBadge status={p.status} /></td>
                  <td className="p-3">
                    <Link
                      to={`/publish?product=${p.slug}`}
                      className="text-[var(--color-brand)] text-xs font-medium hover:underline"
                    >
                      انتشار
                    </Link>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[var(--color-muted)]">
                    محصولی یافت نشد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ProductImagesSection } from "@/components/admin/ProductImagesSection";
import { ProductSizeGuideEditor } from "@/components/admin/ProductSizeGuideEditor";
import { Button } from "@/components/ui/Button";
import {
  adminFetch,
  type ProductAdmin,
  type VariationAdmin,
} from "@/lib/api";
import { canPublishProduct, evaluateProductPublish, isDefaultVariation } from "@/lib/admin-status";
import { parentSelectOptions, type CategoryTreeNode } from "@/lib/category-tree";
import { PRESET_COLORS, slugPart, type PresetColor } from "@/lib/product-presets";
import { EMPTY_SIZE_GUIDE, normalizeSizeGuide, type SizeGuideData } from "@/lib/size-guide";
import { cn } from "@/lib/utils";

type Props = { productId?: number };

export function ProductForm({ productId }: Props) {
  const router = useRouter();
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [variations, setVariations] = useState<VariationAdmin[]>([]);
  const [loading, setLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    parent_category_id: "",
    slug: "",
    title: "",
    base_price: "",
    compare_at_price: "",
    status: "draft",
    meta_title: "",
    meta_description: "",
    description: "",
  });

  const [newVar, setNewVar] = useState({
    sku: "",
    color_name: "",
    color_hex: "",
    size_label: "",
    price_delta: "0",
    stock_quantity: "10",
  });

  const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set());
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set());
  const [bulkStock, setBulkStock] = useState("10");
  const [bulkAdding, setBulkAdding] = useState(false);
  const [imageCount, setImageCount] = useState(0);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [editingVarId, setEditingVarId] = useState<number | null>(null);
  const [editVar, setEditVar] = useState({
    stock_quantity: "",
    price_delta: "",
    is_active: true,
  });
  const [sizeGuide, setSizeGuide] = useState<SizeGuideData>({ ...EMPTY_SIZE_GUIDE });
  const [simpleStock, setSimpleStock] = useState("10");

  const token = () => localStorage.getItem("selectbox_admin_token")!;

  useEffect(() => {
    Promise.all([
      adminFetch<CategoryTreeNode[]>("/api/v1/admin/categories/tree", token()),
    ])
      .then(([tree]) => {
        setCategoryTree(tree);
      })
      .catch(() => setError("خطا در بارگذاری داده‌ها"));
  }, []);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    Promise.all([
      adminFetch<ProductAdmin>(`/api/v1/admin/products/${productId}`, token()),
      adminFetch<VariationAdmin[]>(`/api/v1/admin/products/${productId}/variations`, token()),
    ])
      .then(([p, vars]) => {
        setForm({
          parent_category_id: String(p.parent_category_id),
          slug: p.slug,
          title: p.title,
          base_price: p.base_price,
          compare_at_price: p.compare_at_price ?? "",
          status: p.status,
          meta_title: p.meta_title ?? "",
          meta_description: p.meta_description ?? "",
          description: p.description ?? "",
        });
        setVariations(vars);
        setImageCount(p.image_count);
        setPublishedAt(p.published_at ?? null);
        setSizeGuide(normalizeSizeGuide(p.size_guide_json));
        const defaults = vars.filter(isDefaultVariation);
        const manual = vars.filter((v) => !isDefaultVariation(v));
        if (manual.length === 0 && defaults[0]) {
          setSimpleStock(String(defaults[0].stock_quantity ?? 10));
        }
      })
      .catch(() => setError("محصول یافت نشد"))
      .finally(() => setLoading(false));
  }, [productId]);

  const categoryOptions = useMemo(() => parentSelectOptions(categoryTree, new Set()), [categoryTree]);

  const colorOptions = useMemo((): PresetColor[] => [...PRESET_COLORS], []);
  const sizeOptions: string[] = [];
  const usesSizes = false;

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const body: Record<string, unknown> = {
      parent_category_id: Number(form.parent_category_id),
      slug: form.slug,
      title: form.title,
      base_price: Number(form.base_price),
      compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
      status: form.status,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      description: form.description || null,
      size_guide_json: {
        enabled: sizeGuide.enabled,
        title: sizeGuide.title,
        intro: sizeGuide.intro,
        image_key: sizeGuide.image_key,
        columns: sizeGuide.columns,
        rows: sizeGuide.rows,
        notes: sizeGuide.notes.filter(Boolean),
      },
    };
    try {
      if (productId) {
        await adminFetch(`/api/v1/admin/products/${productId}`, token(), {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        setSuccess("ذخیره شد");
      } else {
        const created = await adminFetch<ProductAdmin>("/api/v1/admin/products", token(), {
          method: "POST",
          body: JSON.stringify(body),
        });
        router.push(`/admin/products/${created.id}/edit`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  }

  async function addVariation(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return;
    try {
      await adminFetch(`/api/v1/admin/products/${productId}/variations`, token(), {
        method: "POST",
        body: JSON.stringify({
          sku: newVar.sku,
          color_name: newVar.color_name || null,
          color_hex: newVar.color_hex || null,
          size_label: newVar.size_label || null,
          price_delta: Number(newVar.price_delta),
          stock_quantity: Number(newVar.stock_quantity),
          is_active: true,
        }),
      });
      const vars = await adminFetch<VariationAdmin[]>(
        `/api/v1/admin/products/${productId}/variations`,
        token(),
      );
      setVariations(vars);
      setNewVar({
        sku: "",
        color_name: "",
        color_hex: "",
        size_label: "",
        price_delta: "0",
        stock_quantity: "10",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در افزودن تنوع");
    }
  }

  async function bulkAddVariations() {
    if (!productId || selectedColors.size === 0) return;
    if (usesSizes && selectedSizes.size === 0) return;
    setBulkAdding(true);
    setError(null);
    try {
      const colors = colorOptions.filter((c) => selectedColors.has(c.name));
      const sizes = usesSizes ? sizeOptions.filter((s) => selectedSizes.has(s)) : [];
      const prefix = form.slug ? slugPart(form.slug).toUpperCase() : `P${productId}`;
      const res = await adminFetch<{ created: number }>(
        `/api/v1/admin/products/${productId}/variations/bulk`,
        token(),
        {
          method: "POST",
          body: JSON.stringify({
            sku_prefix: prefix,
            colors,
            sizes,
            stock_quantity: Number(bulkStock) || 10,
            price_delta: 0,
          }),
        },
      );
      const vars = await adminFetch<VariationAdmin[]>(
        `/api/v1/admin/products/${productId}/variations`,
        token(),
      );
      setVariations(vars);
      setSuccess(`${res.created} تنوع اضافه شد`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در افزودن گروهی");
    } finally {
      setBulkAdding(false);
    }
  }

  function toggleColor(name: string) {
    setSelectedColors((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleSize(size: string) {
    setSelectedSizes((prev) => {
      const next = new Set(prev);
      if (next.has(size)) next.delete(size);
      else next.add(size);
      return next;
    });
  }

  const manualVariations = useMemo(
    () => variations.filter((v) => !isDefaultVariation(v)),
    [variations],
  );
  const isSimpleProduct = manualVariations.length === 0;

  const publishChecks = useMemo(
    () =>
      evaluateProductPublish({
        title: form.title,
        slug: form.slug,
        base_price: form.base_price,
        imageCount,
        simpleStock: Number(simpleStock),
      }),
    [form.title, form.slug, form.base_price, imageCount, simpleStock],
  );

  const readyToPublish = canPublishProduct(publishChecks);

  async function publishProduct() {
    if (!productId || !readyToPublish) return;
    setPublishing(true);
    setError(null);
    setSuccess(null);
    try {
      const body: Record<string, unknown> = { status: "published" };
      if (isSimpleProduct) {
        body.stock_quantity = Math.max(0, Number(simpleStock) || 0);
      }
      await adminFetch<ProductAdmin>(`/api/v1/admin/products/${productId}/status`, token(), {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      const vars = await adminFetch<VariationAdmin[]>(
        `/api/v1/admin/products/${productId}/variations`,
        token(),
      );
      setVariations(vars);
      setField("status", "published");
      setPublishedAt(new Date().toISOString());
      setSuccess(
        isSimpleProduct
          ? "محصول منتشر شد (بدون نیاز به تنوع رنگ/سایز)"
          : "محصول منتشر شد — در فروشگاه قابل مشاهده است",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "انتشار ناموفق");
    } finally {
      setPublishing(false);
    }
  }

  async function unpublishProduct() {
    if (!productId) return;
    setPublishing(true);
    try {
      await adminFetch(`/api/v1/admin/products/${productId}/status`, token(), {
        method: "PATCH",
        body: JSON.stringify({ status: "draft" }),
      });
      setField("status", "draft");
      setPublishedAt(null);
      setSuccess("به پیش‌نویس برگشت");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setPublishing(false);
    }
  }

  async function saveVariationEdit(v: VariationAdmin) {
    try {
      await adminFetch(`/api/v1/admin/variations/${v.id}`, token(), {
        method: "PATCH",
        body: JSON.stringify({
          sku: v.sku,
          color_name: v.color_name,
          color_hex: v.color_hex,
          size_label: v.size_label,
          price_delta: Number(editVar.price_delta),
          stock_quantity: Number(editVar.stock_quantity),
          is_active: editVar.is_active,
        }),
      });
      const vars = await adminFetch<VariationAdmin[]>(
        `/api/v1/admin/products/${productId}/variations`,
        token(),
      );
      setVariations(vars);
      setEditingVarId(null);
      setSuccess("تنوع به‌روز شد");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ویرایش تنوع");
    }
  }

  async function deleteVariation(id: number) {
    if (!confirm("حذف این تنوع؟")) return;
    try {
      await adminFetch(`/api/v1/admin/variations/${id}`, token(), { method: "DELETE" });
      setVariations((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "حذف ناموفق");
    }
  }

  if (loading) {
    return <p className="text-muted">در حال بارگذاری...</p>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{productId ? "ویرایش محصول" : "محصول جدید"}</h1>
        <Link href="/admin/products" className="text-sm text-muted hover:text-[var(--fg)]">
          بازگشت
        </Link>
      </div>

      {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
      {success ? <p className="mb-4 text-sm text-green-400">{success}</p> : null}

      {productId ? (
        <section className="card-theme mb-6 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-medium">انتشار در فروشگاه</h2>
              <p className="mt-1 text-sm text-muted">
                وضعیت:{" "}
                <span className={form.status === "published" ? "text-green-500" : "text-amber-500"}>
                  {form.status === "published" ? "منتشرشده" : "پیش‌نویس"}
                </span>
                {publishedAt ? (
                  <span className="ms-2 text-xs text-muted">
                    ({new Intl.DateTimeFormat("fa-IR").format(new Date(publishedAt))})
                  </span>
                ) : null}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.status === "published" ? (
                <>
                  <Link href={`/product/${form.slug}`} target="_blank" rel="noreferrer">
                    <Button type="button" variant="outline" size="sm">
                      پیش‌نمایش فروشگاه
                    </Button>
                  </Link>
                  <Button type="button" variant="outline" size="sm" disabled={publishing} onClick={unpublishProduct}>
                    پیش‌نویس کردن
                  </Button>
                </>
              ) : (
                <Button type="button" size="sm" disabled={publishing || !readyToPublish} onClick={publishProduct}>
                  {publishing ? "..." : "انتشار محصول"}
                </Button>
              )}
            </div>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {publishChecks.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-sm">
                <span className={c.ok ? "text-green-500" : "text-muted"}>{c.ok ? "✓" : "○"}</span>
                <span className={c.ok ? "" : "text-muted"}>{c.label}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form onSubmit={saveProduct} className="space-y-5 rounded-2xl border border-theme p-6">
        <label className="block text-sm">
          <span className="text-muted">دسته‌بندی</span>
          <select
            required
            className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
            value={form.parent_category_id}
            onChange={(e) => setField("parent_category_id", e.target.value)}
          >
            <option value="">انتخاب دسته</option>
            {categoryOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            از{" "}
            <Link href="/admin/categories" className="underline">
              مدیریت دسته‌ها
            </Link>{" "}
            ساختار فروشگاه را بسازید.
          </p>
        </label>

        <label className="block text-sm">
          <span className="text-muted">عنوان</span>
          <input
            required
            className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="text-muted">اسلاگ</span>
          <input
            required
            className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 font-mono text-sm"
            value={form.slug}
            onChange={(e) => setField("slug", e.target.value)}
            dir="ltr"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-muted">قیمت پایه (تومان)</span>
            <input
              required
              type="number"
              className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
              value={form.base_price}
              onChange={(e) => setField("base_price", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">قیمت قبل تخفیف</span>
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
              value={form.compare_at_price}
              onChange={(e) => setField("compare_at_price", e.target.value)}
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="text-muted">وضعیت</span>
          <select
            className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
            value={form.status}
            onChange={(e) => setField("status", e.target.value)}
          >
            <option value="draft">پیش‌نویس</option>
            <option value="published">منتشر شده</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-muted">توضیح محصول</span>
          <textarea
            rows={4}
            className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="text-muted">عنوان سئو</span>
          <input
            className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
            value={form.meta_title}
            onChange={(e) => setField("meta_title", e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="text-muted">توضیح سئو</span>
          <textarea
            rows={2}
            className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
            value={form.meta_description}
            onChange={(e) => setField("meta_description", e.target.value)}
          />
        </label>

        <Button type="submit" disabled={saving}>
          {saving ? "..." : productId ? "ذخیره تغییرات" : "ایجاد محصول"}
        </Button>
      </form>

      {productId ? <ProductImagesSection productId={productId} onCountChange={setImageCount} /> : null}

      {productId && isSimpleProduct ? (
        <section className="mt-10 rounded-2xl border border-theme p-6">
          <h2 className="mb-2 text-lg font-medium">موجودی محصول ساده</h2>
          <p className="mb-4 text-sm text-muted">
            اگر رنگ یا سایز ندارید، همین کافی است — هنگام انتشار یک SKU داخلی ساخته می‌شود.
          </p>
          <label className="block max-w-xs text-sm">
            <span className="text-muted">موجودی</span>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
              value={simpleStock}
              onChange={(e) => setSimpleStock(e.target.value)}
            />
          </label>
        </section>
      ) : null}

      {productId ? (
        <ProductSizeGuideEditor productId={productId} value={sizeGuide} onChange={setSizeGuide} />
      ) : (
        <p className="mt-10 text-sm text-muted">
          پس از ایجاد محصول می‌توانید جدول مشخصات فنی را تنظیم کنید.
        </p>
      )}

      {productId ? (
        <section className="mt-10 rounded-2xl border border-theme p-6">
          <h2 className="mb-2 text-lg font-medium">تنوع‌ها (اختیاری)</h2>
          <p className="mb-4 text-sm text-muted">
            فقط اگر چند رنگ یا گزینه دارید. در غیر این صورت از «موجودی محصول ساده» استفاده کنید.
          </p>

          <div className="mb-6">
            <p className="mb-2 text-xs text-muted">رنگ‌ها</p>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => toggleColor(c.name)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                    selectedColors.has(c.name)
                      ? "border-[var(--accent)] bg-surface"
                      : "border-theme",
                  )}
                >
                  <span
                    className="h-4 w-4 rounded-full border border-white/20"
                    style={{ backgroundColor: c.hex }}
                  />
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {usesSizes ? (
            <div className="mb-6">
              <p className="mb-2 text-xs text-muted">سایزها</p>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSize(s)}
                    className={cn(
                      "min-w-[2.5rem] rounded-lg border px-3 py-1.5 text-sm transition",
                      selectedSizes.has(s)
                        ? "border-[var(--accent)] bg-surface"
                        : "border-theme",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="mb-6 text-xs text-muted">این نوع محصول سایز ندارد — هر رنگ یک تنوع جداست.</p>
          )}

          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="text-muted">موجودی هر تنوع</span>
              <input
                type="number"
                className="mt-1 block w-24 rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
                value={bulkStock}
                onChange={(e) => setBulkStock(e.target.value)}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              disabled={
                bulkAdding || selectedColors.size === 0 || (usesSizes && selectedSizes.size === 0)
              }
              onClick={bulkAddVariations}
            >
              {bulkAdding
                ? "..."
                : `ساخت ${
                    usesSizes ? selectedColors.size * selectedSizes.size : selectedColors.size
                  } تنوع`}
            </Button>
          </div>

          {manualVariations.length > 0 ? (
            <ul className="mb-6 max-h-64 space-y-2 overflow-y-auto text-sm">
              {manualVariations.map((v) => (
                <li key={v.id} className="rounded-lg border border-theme bg-[var(--input-bg)]/50 px-3 py-2">
                  {editingVarId === v.id ? (
                    <div className="grid gap-2 sm:grid-cols-4">
                      <input
                        type="number"
                        className="input-theme px-2 py-1 text-xs"
                        value={editVar.stock_quantity}
                        onChange={(e) => setEditVar((x) => ({ ...x, stock_quantity: e.target.value }))}
                        placeholder="موجودی"
                      />
                      <input
                        type="number"
                        className="input-theme px-2 py-1 text-xs"
                        value={editVar.price_delta}
                        onChange={(e) => setEditVar((x) => ({ ...x, price_delta: e.target.value }))}
                        placeholder="دلتا قیمت"
                      />
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={editVar.is_active}
                          onChange={(e) => setEditVar((x) => ({ ...x, is_active: e.target.checked }))}
                        />
                        فعال
                      </label>
                      <div className="flex gap-1">
                        <Button type="button" size="sm" onClick={() => saveVariationEdit(v)}>
                          ذخیره
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setEditingVarId(null)}>
                          لغو
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {v.sku} — {v.color_name ?? "—"} / {v.size_label ?? "—"}
                        {!v.is_active ? <span className="ms-2 text-xs text-red-400">غیرفعال</span> : null}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-muted">موجودی: {v.stock_quantity}</span>
                        <button
                          type="button"
                          className="text-xs text-[var(--accent)]"
                          onClick={() => {
                            setEditingVarId(v.id);
                            setEditVar({
                              stock_quantity: String(v.stock_quantity),
                              price_delta: v.price_delta,
                              is_active: v.is_active,
                            });
                          }}
                        >
                          ویرایش
                        </button>
                        <button
                          type="button"
                          className="text-xs text-red-400"
                          onClick={() => deleteVariation(v.id)}
                        >
                          حذف
                        </button>
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-muted">
              هنوز تنوعی نیست — رنگ{usesSizes ? " و سایز" : ""} را انتخاب و دکمه ساخت را بزنید
            </p>
          )}

          <p className="mb-3 text-xs text-muted">یا تکی اضافه کنید:</p>
          <form onSubmit={addVariation} className="grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="SKU"
              className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 font-mono text-sm"
              value={newVar.sku}
              onChange={(e) => setNewVar((v) => ({ ...v, sku: e.target.value }))}
              dir="ltr"
            />
            <input
              placeholder="رنگ"
              className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
              value={newVar.color_name}
              onChange={(e) => setNewVar((v) => ({ ...v, color_name: e.target.value }))}
            />
            <input
              placeholder="#hex"
              className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 font-mono text-sm"
              value={newVar.color_hex}
              onChange={(e) => setNewVar((v) => ({ ...v, color_hex: e.target.value }))}
              dir="ltr"
            />
            <input
              placeholder="سایز"
              className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
              value={newVar.size_label}
              onChange={(e) => setNewVar((v) => ({ ...v, size_label: e.target.value }))}
            />
            <input
              type="number"
              placeholder="موجودی"
              className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
              value={newVar.stock_quantity}
              onChange={(e) => setNewVar((v) => ({ ...v, stock_quantity: e.target.value }))}
            />
            <Button type="submit" variant="outline" className="sm:col-span-2">
              افزودن تکی
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}

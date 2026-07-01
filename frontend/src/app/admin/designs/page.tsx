"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { adminFetch, type CategoryAdmin, type DesignAdmin } from "@/lib/api";
import { apiUrl } from "@/lib/api-base";

type Asset = {
  id: number;
  variant_key: string;
  url: string;
  storage_key: string;
};

const emptyDesign = {
  code: "",
  title: "",
  slug: "",
  thematic_category_id: "",
  description: "",
  status: "draft",
};

export default function AdminDesignsPage() {
  const [designs, setDesigns] = useState<DesignAdmin[]>([]);
  const [categories, setCategories] = useState<CategoryAdmin[]>([]);
  const [form, setForm] = useState(emptyDesign);
  const [editId, setEditId] = useState<number | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [uploadDesignId, setUploadDesignId] = useState<number | null>(null);
  const [variantKey, setVariantKey] = useState("hero");
  const [file, setFile] = useState<File | null>(null);

  const token = () => localStorage.getItem("coralay_admin_token")!;

  const load = () => {
    adminFetch<DesignAdmin[]>("/api/v1/admin/designs", token()).then(setDesigns).catch(() => {});
    adminFetch<CategoryAdmin[]>("/api/v1/admin/categories", token()).then(setCategories).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!designs.length) return;
    const id = Number(new URLSearchParams(window.location.search).get("design"));
    if (!id) return;
    const d = designs.find((row) => row.id === id);
    if (!d) return;
    setEditId(d.id);
    setForm({
      code: d.code,
      title: d.title,
      slug: d.slug,
      thematic_category_id: String(d.thematic_category_id),
      description: "",
      status: "published",
    });
    void loadAssets(d.id);
  }, [designs]);

  async function loadAssets(designId: number) {
    const rows = await adminFetch<Asset[]>(`/api/v1/admin/designs/${designId}/assets`, token());
    setAssets(rows);
    setUploadDesignId(designId);
  }

  async function saveDesign(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      ...form,
      thematic_category_id: Number(form.thematic_category_id),
    };
    if (editId) {
      await adminFetch(`/api/v1/admin/designs/${editId}`, token(), {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    } else {
      await adminFetch("/api/v1/admin/designs", token(), {
        method: "POST",
        body: JSON.stringify(body),
      });
    }
    setForm(emptyDesign);
    setEditId(null);
    load();
  }

  async function removeDesign(id: number) {
    if (!confirm("حذف طرح و محصولات وابسته؟")) return;
    try {
      await adminFetch(`/api/v1/admin/designs/${id}`, token(), { method: "DELETE" });
      setAssets([]);
      setUploadDesignId(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطا در حذف طرح");
    }
  }

  async function uploadAsset(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadDesignId || !file) return;
    const fd = new FormData();
    fd.append("variant_key", variantKey);
    fd.append("file", file);
    const res = await fetch(apiUrl(`/api/v1/admin/designs/${uploadDesignId}/assets`), {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}` },
      body: fd,
    });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    setFile(null);
    loadAssets(uploadDesignId);
  }

  async function deleteAsset(assetId: number) {
    if (!uploadDesignId) return;
    await adminFetch(`/api/v1/admin/designs/${uploadDesignId}/assets/${assetId}`, token(), {
      method: "DELETE",
    });
    loadAssets(uploadDesignId);
  }

  const thematicCats = categories.filter(
    (c) => !["tshirt", "hoodie", "mug"].includes(c.slug),
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">طرح خام (تولید)</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          فایل‌های چاپ برای تولید — وقتی سفارش ثبت شد از اینجا طرح خام را پیدا کنید. هر محصول فروشگاه به
          یک طرح لینک است؛ محصولات هم‌طرح در صفحه محصول به هم پیشنهاد می‌شوند.
        </p>
      </div>

      <form onSubmit={saveDesign} className="card-theme grid max-w-xl gap-3 p-5">
        <input
          placeholder="کد طرح"
          className="input-theme font-mono"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          required
        />
        <input
          placeholder="عنوان"
          className="input-theme"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <input
          placeholder="اسلاگ"
          className="input-theme font-mono"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          dir="ltr"
          required
        />
        <select
          className="input-theme"
          value={form.thematic_category_id}
          onChange={(e) => setForm({ ...form, thematic_category_id: e.target.value })}
          required
        >
          <option value="">دسته موضوعی</option>
          {thematicCats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_fa}
            </option>
          ))}
        </select>
        <select
          className="input-theme"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          <option value="draft">پیش‌نویس</option>
          <option value="published">منتشر</option>
        </select>
        <Button type="submit">{editId ? "ذخیره طرح" : "ایجاد طرح"}</Button>
      </form>

      <ul className="space-y-3">
        {designs.map((d) => (
          <li key={d.id} className="card-theme p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{d.title}</p>
                <p className="text-xs text-muted font-mono">{d.code} · {d.slug}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditId(d.id);
                    setForm({
                      code: d.code,
                      title: d.title,
                      slug: d.slug,
                      thematic_category_id: String(d.thematic_category_id),
                      description: "",
                      status: "published",
                    });
                    loadAssets(d.id);
                  }}
                >
                  ویرایش / تصاویر
                </Button>
                <Button size="sm" variant="outline" onClick={() => removeDesign(d.id)}>
                  حذف
                </Button>
              </div>
            </div>
            {uploadDesignId === d.id ? (
              <div className="mt-4 border-t border-theme pt-4">
                <p className="mb-2 text-sm text-muted">تصاویر طرح (آپلود دستی)</p>
                {assets.length > 0 ? (
                  <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {assets.map((a) => (
                      <div key={a.id} className="relative rounded-xl border border-theme p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.url} alt={a.variant_key} className="aspect-square w-full rounded-lg object-cover" />
                        <p className="mt-1 text-xs">{a.variant_key}</p>
                        <button
                          type="button"
                          className="mt-1 text-xs text-red-400"
                          onClick={() => deleteAsset(a.id)}
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mb-3 text-xs text-muted">هنوز تصویری نیست</p>
                )}
                <form onSubmit={uploadAsset} className="flex flex-wrap gap-2">
                  <input
                    placeholder="کلید (مثلاً hero)"
                    className="input-theme text-sm"
                    value={variantKey}
                    onChange={(e) => setVariantKey(e.target.value)}
                  />
                  <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  <Button type="submit" size="sm">
                    آپلود
                  </Button>
                </form>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

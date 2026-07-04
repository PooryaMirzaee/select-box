"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Plus, Trash2 } from "@/components/icons";

import { Button } from "@/components/ui/Button";
import { adminFetch, type BusinessLandingAdmin } from "@/lib/api";
import { cn } from "@/lib/utils";

type JsonListKey =
  | "features"
  | "pricing_tiers"
  | "use_cases"
  | "process_steps"
  | "faqs"
  | "stats"
  | "trust_badges"
  | "testimonials"
  | "trust_logos";

const EMPTY_LISTS: Record<JsonListKey, () => unknown> = {
  features: () => ({ icon: "package", title: "", description: "" }),
  pricing_tiers: () => ({ min_qty: 10, unit_price_toman: 0, label_fa: "" }),
  use_cases: () => ({ title: "", description: "" }),
  process_steps: () => ({ title: "", description: "" }),
  faqs: () => ({ question: "", answer: "" }),
  stats: () => ({ value: "", label: "" }),
  trust_badges: () => ({ icon: "check", title: "", description: "" }),
  testimonials: () => ({ quote: "", author_name: "", author_role: "", company: "", rating: 5 }),
  trust_logos: () => ({ name_fa: "" }),
};

export default function AdminBusinessPage() {
  const [landings, setLandings] = useState<BusinessLandingAdmin[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [form, setForm] = useState<BusinessLandingAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const token = () => localStorage.getItem("selectbox_admin_token")!;

  useEffect(() => {
    adminFetch<BusinessLandingAdmin[]>("/api/v1/admin/business/landings", token())
      .then((rows) => {
        setLandings(rows);
        if (rows.length) {
          setActiveId(rows[0].id);
          setForm(rows[0]);
        }
      })
      .catch(() => setMsg("خطا در بارگذاری"))
      .finally(() => setLoading(false));
  }, []);

  function selectLanding(row: BusinessLandingAdmin) {
    setActiveId(row.id);
    setForm({ ...row });
    setMsg(null);
  }

  function patchField<K extends keyof BusinessLandingAdmin>(key: K, value: BusinessLandingAdmin[K]) {
    if (!form) return;
    setForm({ ...form, [key]: value });
  }

  function patchListItem(key: JsonListKey, index: number, field: string, value: string | number) {
    if (!form) return;
    const list = [...(form[key] as Record<string, unknown>[])];
    list[index] = { ...list[index], [field]: value };
    setForm({ ...form, [key]: list as BusinessLandingAdmin[typeof key] });
  }

  function addListItem(key: JsonListKey) {
    if (!form) return;
    const list = [...(form[key] as unknown[])];
    list.push(EMPTY_LISTS[key]());
    setForm({ ...form, [key]: list as BusinessLandingAdmin[typeof key] });
  }

  function removeListItem(key: JsonListKey, index: number) {
    if (!form) return;
    const list = (form[key] as unknown[]).filter((_, i) => i !== index);
    setForm({ ...form, [key]: list as BusinessLandingAdmin[typeof key] });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setMsg(null);
    try {
      const body = {
        name_fa: form.name_fa,
        title: form.title,
        subtitle: form.subtitle,
        hero_badge: form.hero_badge,
        meta_title: form.meta_title,
        meta_description: form.meta_description,
        min_order_qty: form.min_order_qty,
        features: form.features,
        pricing_tiers: form.pricing_tiers,
        use_cases: form.use_cases,
        process_steps: form.process_steps,
        faqs: form.faqs,
        stats: form.stats,
        gallery_images: form.gallery_images.map(({ image_url: _u, ...g }) => g),
        gallery_title: form.gallery_title,
        trust_logos: form.trust_logos.map(({ logo_url: _u, ...l }) => l),
        trust_badges: form.trust_badges,
        testimonials: form.testimonials,
        trust_section_title: form.trust_section_title,
        cta_primary: form.cta_primary,
        cta_secondary: form.cta_secondary,
        is_published: form.is_published,
        sort_order: form.sort_order,
      };
      const updated = await adminFetch<BusinessLandingAdmin>(
        `/api/v1/admin/business/landings/${form.id}`,
        token(),
        { method: "PATCH", body: JSON.stringify(body) },
      );
      setLandings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setForm(updated);
      setMsg("ذخیره شد");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  }

  async function uploadHero(file: File) {
    if (!form) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/v1/admin/business/landings/${form.id}/hero-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}` },
      body: fd,
    });
    if (!res.ok) throw new Error("آپلود ناموفق");
    const data = await res.json();
    patchField("hero_image_url", data.hero_image_url);
    patchField("hero_image_key", data.storage_key);
  }

  async function uploadGallery(file: File, caption: string) {
    if (!form) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("caption_fa", caption);
    const res = await fetch(`/api/v1/admin/business/landings/${form.id}/gallery`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}` },
      body: fd,
    });
    if (!res.ok) throw new Error("آپلود ناموفق");
    const updated = (await res.json()) as BusinessLandingAdmin;
    setForm(updated);
    setLandings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setMsg("تصویر گالری اضافه شد");
  }

  async function deleteGalleryItem(itemId: string) {
    if (!form) return;
    const updated = await adminFetch<BusinessLandingAdmin>(
      `/api/v1/admin/business/landings/${form.id}/gallery/${itemId}`,
      token(),
      { method: "DELETE" },
    );
    setForm(updated);
    setLandings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  async function uploadTrustLogo(file: File, name: string) {
    if (!form) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name_fa", name);
    const res = await fetch(`/api/v1/admin/business/landings/${form.id}/trust-logos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}` },
      body: fd,
    });
    if (!res.ok) throw new Error("آپلود ناموفق");
    const updated = (await res.json()) as BusinessLandingAdmin;
    setForm(updated);
    setLandings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setMsg("لوگو اضافه شد");
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted">
        <Loader2 className="h-5 w-5" />
        بارگذاری...
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">سفارش سازمانی</h1>
          <p className="mt-1 text-sm text-muted">مدیریت لندینگ‌های B2B برای هر نوع محصول</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/business/quotes">
            <Button variant="outline" size="sm">
              درخواست‌ها
            </Button>
          </Link>
          {form ? (
            <Link href={form.slug === "hub" ? "/business" : `/business/${form.slug}`} target="_blank">
              <Button variant="ghost" size="sm">
                <ExternalLink className="me-1 h-3.5 w-3.5" />
                پیش‌نمایش
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {landings.map((l) => (
          <button
            key={l.id}
            type="button"
            className={cn("chip-theme", activeId === l.id && "is-active")}
            onClick={() => selectLanding(l)}
          >
            {l.name_fa}
          </button>
        ))}
      </div>

      {form ? (
        <form onSubmit={save} className="mt-8 space-y-8">
          <section className="card-theme space-y-4 p-6">
            <h2 className="font-medium">اطلاعات اصلی</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-muted">عنوان</span>
                <input className="input-theme mt-1" value={form.title} onChange={(e) => patchField("title", e.target.value)} />
              </label>
              <label className="block text-sm">
                <span className="text-muted">نشان hero</span>
                <input className="input-theme mt-1" value={form.hero_badge ?? ""} onChange={(e) => patchField("hero_badge", e.target.value)} />
              </label>
              <label className="col-span-full block text-sm">
                <span className="text-muted">زیرعنوان</span>
                <textarea className="input-theme mt-1 min-h-[72px]" value={form.subtitle ?? ""} onChange={(e) => patchField("subtitle", e.target.value)} />
              </label>
              <label className="block text-sm">
                <span className="text-muted">حداقل سفارش</span>
                <input type="number" className="input-theme mt-1" value={form.min_order_qty} onChange={(e) => patchField("min_order_qty", Number(e.target.value))} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_published} onChange={(e) => patchField("is_published", e.target.checked)} />
                منتشر شده
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-muted">meta title</span>
                <input className="input-theme mt-1" value={form.meta_title ?? ""} onChange={(e) => patchField("meta_title", e.target.value)} />
              </label>
              <label className="block text-sm">
                <span className="text-muted">meta description</span>
                <input className="input-theme mt-1" value={form.meta_description ?? ""} onChange={(e) => patchField("meta_description", e.target.value)} />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-muted">تصویر hero</span>
              <input
                type="file"
                accept="image/*"
                className="mt-1 text-sm"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadHero(f).catch(() => setMsg("خطا در آپلود"));
                }}
              />
            </label>
          </section>

          <section className="card-theme space-y-4 p-6">
            <h2 className="font-medium">گالری تصاویر</h2>
            <label className="block text-sm">
              <span className="text-muted">عنوان بخش</span>
              <input
                className="input-theme mt-1"
                value={form.gallery_title ?? ""}
                onChange={(e) => patchField("gallery_title", e.target.value)}
              />
            </label>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {form.gallery_images.map((item) => (
                <div key={item.id} className="relative overflow-hidden rounded-xl border border-theme">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt="" className="aspect-square w-full object-cover" />
                  ) : null}
                  <button
                    type="button"
                    className="absolute end-1 top-1 rounded-full bg-[var(--card)] p-1 text-red-500 shadow"
                    onClick={() => void deleteGalleryItem(item.id).catch(() => setMsg("خطا"))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  {item.caption_fa ? (
                    <p className="truncate px-2 py-1 text-[10px] text-muted">{item.caption_fa}</p>
                  ) : null}
                </div>
              ))}
            </div>
            <GalleryUpload onUpload={(f, c) => void uploadGallery(f, c).catch(() => setMsg("خطا در آپلود"))} />
          </section>

          <section className="card-theme space-y-4 p-6">
            <h2 className="font-medium">اعتمادسازی</h2>
            <label className="block text-sm">
              <span className="text-muted">عنوان بخش اعتماد</span>
              <input
                className="input-theme mt-1"
                value={form.trust_section_title ?? ""}
                onChange={(e) => patchField("trust_section_title", e.target.value)}
              />
            </label>
            <TrustLogoUpload onUpload={(f, n) => void uploadTrustLogo(f, n).catch(() => setMsg("خطا"))} />
          </section>

          <ListEditor
            title="لوگوی مشتریان (متنی)"
            items={form.trust_logos.filter((l) => !l.logo_url)}
            fields={[{ key: "name_fa", label: "نام شرکت" }]}
            onChange={(i, k, v) => {
              const idx = form.trust_logos.findIndex((l, j) => !l.logo_url && j === i);
              if (idx >= 0) patchListItem("trust_logos", idx, k, v);
            }}
            onAdd={() => addListItem("trust_logos")}
            onRemove={(i) => {
              const idx = form.trust_logos.findIndex((l, j) => !l.logo_url && j === i);
              if (idx >= 0) removeListItem("trust_logos", idx);
            }}
          />

          <ListEditor
            title="نشان‌های اعتماد"
            items={form.trust_badges}
            fields={[
              { key: "icon", label: "آیکون" },
              { key: "title", label: "عنوان" },
              { key: "description", label: "توضیح" },
            ]}
            onChange={(i, k, v) => patchListItem("trust_badges", i, k, v)}
            onAdd={() => addListItem("trust_badges")}
            onRemove={(i) => removeListItem("trust_badges", i)}
          />

          <ListEditor
            title="نظرات مشتریان"
            items={form.testimonials}
            fields={[
              { key: "quote", label: "نظر" },
              { key: "author_name", label: "نام" },
              { key: "author_role", label: "سمت" },
              { key: "company", label: "شرکت" },
              { key: "rating", label: "امتیاز (۱–۵)", type: "number" },
            ]}
            onChange={(i, k, v) => patchListItem("testimonials", i, k, v)}
            onAdd={() => addListItem("testimonials")}
            onRemove={(i) => removeListItem("testimonials", i)}
          />

          <ListEditor
            title="ویژگی‌ها"
            items={form.features}
            fields={[
              { key: "icon", label: "آیکون" },
              { key: "title", label: "عنوان" },
              { key: "description", label: "توضیح" },
            ]}
            onChange={(i, k, v) => patchListItem("features", i, k, v)}
            onAdd={() => addListItem("features")}
            onRemove={(i) => removeListItem("features", i)}
          />

          <ListEditor
            title="قیمت پلکانی"
            items={form.pricing_tiers}
            fields={[
              { key: "label_fa", label: "برچسب" },
              { key: "min_qty", label: "حداقل تعداد", type: "number" },
              { key: "unit_price_toman", label: "قیمت واحد (تومان)", type: "number" },
            ]}
            onChange={(i, k, v) => patchListItem("pricing_tiers", i, k, v)}
            onAdd={() => addListItem("pricing_tiers")}
            onRemove={(i) => removeListItem("pricing_tiers", i)}
          />

          <ListEditor
            title="کاربردها"
            items={form.use_cases}
            fields={[
              { key: "title", label: "عنوان" },
              { key: "description", label: "توضیح" },
            ]}
            onChange={(i, k, v) => patchListItem("use_cases", i, k, v)}
            onAdd={() => addListItem("use_cases")}
            onRemove={(i) => removeListItem("use_cases", i)}
          />

          <ListEditor
            title="مراحل فرآیند"
            items={form.process_steps}
            fields={[
              { key: "title", label: "عنوان" },
              { key: "description", label: "توضیح" },
            ]}
            onChange={(i, k, v) => patchListItem("process_steps", i, k, v)}
            onAdd={() => addListItem("process_steps")}
            onRemove={(i) => removeListItem("process_steps", i)}
          />

          <ListEditor
            title="آمار / اعتماد"
            items={form.stats}
            fields={[
              { key: "value", label: "مقدار" },
              { key: "label", label: "برچسب" },
            ]}
            onChange={(i, k, v) => patchListItem("stats", i, k, v)}
            onAdd={() => addListItem("stats")}
            onRemove={(i) => removeListItem("stats", i)}
          />

          <ListEditor
            title="سوالات متداول"
            items={form.faqs}
            fields={[
              { key: "question", label: "سؤال" },
              { key: "answer", label: "پاسخ" },
            ]}
            onChange={(i, k, v) => patchListItem("faqs", i, k, v)}
            onAdd={() => addListItem("faqs")}
            onRemove={(i) => removeListItem("faqs", i)}
          />

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={saving}>
              {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
            </Button>
            {msg ? <span className="text-sm text-muted">{msg}</span> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}

function GalleryUpload({ onUpload }: { onUpload: (file: File, caption: string) => void }) {
  const [caption, setCaption] = useState("");
  return (
    <div className="flex flex-wrap items-end gap-3 border-t border-theme pt-4">
      <label className="block text-sm">
        <span className="text-muted">کپشن (اختیاری)</span>
        <input className="input-theme mt-1" value={caption} onChange={(e) => setCaption(e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="text-muted">افزودن تصویر</span>
        <input
          type="file"
          accept="image/*"
          className="mt-1 text-sm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              onUpload(f, caption);
              setCaption("");
              e.target.value = "";
            }
          }}
        />
      </label>
    </div>
  );
}

function TrustLogoUpload({ onUpload }: { onUpload: (file: File, name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block text-sm">
        <span className="text-muted">نام شرکت</span>
        <input className="input-theme mt-1" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="text-muted">آپلود لوگو</span>
        <input
          type="file"
          accept="image/*"
          className="mt-1 text-sm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              onUpload(f, name);
              setName("");
              e.target.value = "";
            }
          }}
        />
      </label>
    </div>
  );
}

function ListEditor({
  title,
  items,
  fields,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  items: Record<string, unknown>[];
  fields: { key: string; label: string; type?: string }[];
  onChange: (index: number, key: string, value: string | number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <section className="card-theme p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-medium">{title}</h2>
        <button type="button" className="chip-theme !min-h-[32px] !px-3 !text-xs" onClick={onAdd}>
          <Plus className="me-1 h-3 w-3" />
          افزودن
        </button>
      </div>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-theme p-4">
            <div className="mb-3 flex justify-end">
              <button type="button" className="text-muted hover:text-red-500" onClick={() => onRemove(i)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((f) => (
                <label key={f.key} className="block text-sm">
                  <span className="text-muted">{f.label}</span>
                  <input
                    type={f.type ?? "text"}
                    className="input-theme mt-1"
                    value={String(item[f.key] ?? "")}
                    onChange={(e) =>
                      onChange(i, f.key, f.type === "number" ? Number(e.target.value) : e.target.value)
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

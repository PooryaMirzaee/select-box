"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, ExternalLink, Palette } from "@/components/icons";
import { useEffect, useState } from "react";

import { AdminArtLibrary } from "@/components/admin/AdminArtLibrary";
import { AdminTemplateEditor } from "@/components/admin/AdminTemplateEditor";
import { Button } from "@/components/ui/Button";
import { adminFetch } from "@/lib/api";
import { apiUrl } from "@/lib/api-base";
import { adminCreateTemplate, type ProductTemplate } from "@/lib/customizer";

export default function AdminCustomizerPage() {
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [commission, setCommission] = useState("15");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("45900");
  const [newCat, setNewCat] = useState("tshirt");
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("coralay_admin_token") ?? "";
    setToken(t);
    if (!t) return;
    fetch(apiUrl("/api/v1/customizer/templates"))
      .then((r) => r.json())
      .then(setTemplates)
      .catch(() => {});
    adminFetch<{ creator_commission_percent?: number }>("/api/v1/admin/settings", t)
      .then((s) => {
        const all = s as Record<string, unknown>;
        if (all.creator_commission_percent != null) {
          setCommission(String(all.creator_commission_percent));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">سفارشی‌سازی</h1>
      <p className="mt-2 text-sm text-muted">
        مدیریت نماها (سایدها)، محدوده چاپ، mockup و رنگ‌های Design Lab
      </p>

      <section className="mt-8 rounded-xl border border-theme p-6">
        <h2 className="flex items-center gap-2 font-medium">
          <Palette className="h-4 w-4" />
          قالب‌های فعال
        </h2>
        <ul className="mt-4 space-y-2">
          {templates.map((t) => (
            <li key={t.slug} className="rounded-lg border border-theme">
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <button
                  type="button"
                  className="flex flex-1 items-center gap-2 text-start"
                  onClick={() => setExpanded(expanded === t.slug ? null : t.slug)}
                >
                  {expanded === t.slug ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span>{t.name_fa}</span>
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-muted">{Number(t.base_price).toLocaleString("fa-IR")} تومان</span>
                  <Link href={`/customize/${t.slug}`} className="flex items-center gap-1 text-orange-400 hover:underline">
                    Design Lab
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
              {expanded === t.slug && token ? (
                <div className="border-t border-theme px-2 pb-2">
                  <AdminTemplateEditor
                    template={t}
                    token={token}
                    onUpdated={(updated) => {
                      setTemplates((list) => list.map((x) => (x.slug === updated.slug ? updated : x)));
                    }}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        {templates.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            قالب یافت نشد —{" "}
            <code className="rounded bg-[var(--input-bg)] px-1">python scripts/seed.py customizer</code>
          </p>
        ) : null}
      </section>

      <section className="mt-6 rounded-xl border border-theme p-6">
        <h2 className="font-medium">افزودن محصول جدید (Design Lab)</h2>
        <p className="mt-1 text-sm text-muted">مثلاً سویشرت، ماگ، کلاه — بعد mockup و رنگ را آپلود کنید</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            placeholder="slug — sweatshirt"
            className="rounded border border-theme px-3 py-2 text-sm"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
          />
          <input
            placeholder="نام فارسی"
            className="rounded border border-theme px-3 py-2 text-sm"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="number"
            placeholder="قیمت پایه"
            className="rounded border border-theme px-3 py-2 text-sm"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
          />
          <select
            className="rounded border border-theme px-3 py-2 text-sm"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
          >
            <option value="tshirt">تیشرت</option>
            <option value="mug">ماگ</option>
            <option value="hoodie">هودی</option>
          </select>
        </div>
        {createMsg ? <p className="mt-2 text-sm text-muted">{createMsg}</p> : null}
        <Button
          className="mt-3"
          size="sm"
          disabled={!token || !newSlug || !newName}
          onClick={async () => {
            setCreateMsg(null);
            try {
              const t = await adminCreateTemplate(
                {
                  slug: newSlug.trim().toLowerCase(),
                  name_fa: newName.trim(),
                  base_price: Number(newPrice),
                  category_slug: newCat,
                  config_json: {
                    sides: [
                      {
                        id: "front",
                        label_fa: "جلو",
                        sort_order: 0,
                        print_area: { x: 0.18, y: 0.14, width: 0.64, height: 0.52 },
                      },
                    ],
                    colors: [{ name: "سفید", hex: "#f5f5f5" }],
                    sizes: ["S", "M", "L", "XL"],
                    mockup: { views: {} },
                  },
                },
                token,
              );
              setTemplates((list) => [...list, t]);
              setCreateMsg("قالب اضافه شد ✓");
              setExpanded(t.slug);
            } catch {
              setCreateMsg("خطا — slug تکراری یا دسته نامعتبر");
            }
          }}
        >
          ایجاد قالب
        </Button>
      </section>

      {token ? <AdminArtLibrary token={token} /> : null}

      <section className="mt-6 rounded-xl border border-theme p-6">
        <h2 className="font-medium">بازارچهٔ طرح کاربران</h2>
        <p className="mt-2 text-sm text-muted">
          کاربران می‌توانند طرحشان را منتشر کنند و {commission}٪ از هر فروش دریافت کنند.
        </p>
        <Link href="/customize" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            باز کردن Design Lab
          </Button>
        </Link>
      </section>
    </div>
  );
}

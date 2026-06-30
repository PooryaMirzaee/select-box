"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { HomepageBannerEditor } from "@/components/admin/homepage/HomepageBannerEditor";
import { Button } from "@/components/ui/Button";
import { ExternalLink, Loader2 } from "@/components/icons";
import { adminFetch } from "@/lib/api";
import {
  DEFAULT_HOMEPAGE_CONFIG,
  HOMEPAGE_SECTION_META,
  type HomepageAdminBundle,
  type HomepageConfig,
  type HomepageSection,
} from "@/lib/homepage";
import { cn } from "@/lib/utils";

type SectionId = "carousel" | "hero" | "featured" | "promo";

const inputClass = "rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm w-full";

export default function AdminHomepagePage() {
  const [bundle, setBundle] = useState<HomepageAdminBundle | null>(null);
  const [draft, setDraft] = useState<HomepageConfig>(DEFAULT_HOMEPAGE_CONFIG);
  const [selected, setSelected] = useState<SectionId>("carousel");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const token = () => localStorage.getItem("coralay_admin_token")!;

  const load = async () => {
    const data = await adminFetch<HomepageAdminBundle>("/api/v1/admin/homepage", token());
    setBundle(data);
    setDraft({
      sections: data.sections,
      hero: data.hero,
      featured: data.featured,
      show_promo_fallback: data.show_promo_fallback,
    });
  };

  useEffect(() => {
    load()
      .catch(() => setMsg("خطا در بارگذاری"))
      .finally(() => setLoading(false));
  }, []);

  const dirty = useMemo(() => {
    if (!bundle) return false;
    return JSON.stringify(draft) !== JSON.stringify({
      sections: bundle.sections,
      hero: bundle.hero,
      featured: bundle.featured,
      show_promo_fallback: bundle.show_promo_fallback,
    });
  }, [bundle, draft]);

  function patchSection(id: string, enabled: boolean) {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === id ? { ...s, enabled } : s)),
    }));
  }

  function moveSection(id: string, direction: "up" | "down") {
    setDraft((prev) => {
      const sections = [...prev.sections];
      const index = sections.findIndex((s) => s.id === id);
      if (index < 0) return prev;
      const swap = direction === "up" ? index - 1 : index + 1;
      if (swap < 0 || swap >= sections.length) return prev;
      [sections[index], sections[swap]] = [sections[swap], sections[index]];
      return { ...prev, sections };
    });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const updated = await adminFetch<HomepageConfig>("/api/v1/admin/homepage", token(), {
        method: "PATCH",
        body: JSON.stringify(draft),
      });
      setDraft(updated);
      await load();
      setMsg("ذخیره شد");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const sectionMeta = HOMEPAGE_SECTION_META[selected];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="sticky top-0 z-10 -mx-2 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-theme bg-[var(--bg)]/95 px-2 py-4 backdrop-blur">
        <div>
          <h1 className="text-2xl font-semibold">صفحهٔ اصلی</h1>
          <p className="mt-1 text-sm text-muted">مدیریت بخش‌ها، متن‌ها و بنرهای فروشگاه</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {msg ? <span className="text-sm text-muted">{msg}</span> : null}
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-full border border-theme px-4 py-2 text-sm transition hover:bg-[var(--bg-elevated)]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            پیش‌نمایش
          </Link>
          <Button onClick={save} disabled={saving || !dirty}>
            {saving ? "ذخیره…" : "ذخیره تغییرات"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-2">
          <p className="px-2 text-xs font-medium tracking-wide text-muted">ساختار صفحه</p>
          {draft.sections.map((section: HomepageSection, index) => {
            const meta = HOMEPAGE_SECTION_META[section.id];
            if (!meta) return null;
            return (
              <div
                key={section.id}
                className={cn(
                  "rounded-xl border transition",
                  selected === section.id
                    ? "border-[color-mix(in_srgb,var(--accent)_50%,var(--border))] bg-[var(--accent-soft)]"
                    : "border-theme bg-[var(--bg-elevated)]/30",
                )}
              >
                <button
                  type="button"
                  className="w-full px-3 py-3 text-start"
                  onClick={() => setSelected(section.id as SectionId)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{meta.label}</p>
                      <p className="mt-0.5 text-[11px] text-muted">{meta.description}</p>
                    </div>
                    <label className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={section.enabled}
                        onChange={(e) => patchSection(section.id, e.target.checked)}
                        className="rounded"
                      />
                    </label>
                  </div>
                </button>
                <div className="flex border-t border-theme px-2 py-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    className="flex-1 py-1 text-xs text-muted disabled:opacity-30"
                    onClick={() => moveSection(section.id, "up")}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === draft.sections.length - 1}
                    className="flex-1 py-1 text-xs text-muted disabled:opacity-30"
                    onClick={() => moveSection(section.id, "down")}
                  >
                    ↓
                  </button>
                </div>
              </div>
            );
          })}
          <p className="px-2 pt-2 text-[11px] leading-relaxed text-muted">
            با غیرفعال کردن یا جابه‌جایی بخش‌ها، چیدمان صفحهٔ اصلی را تنظیم کنید. تغییرات بنر بلافاصله ذخیره
            می‌شوند؛ تنظیمات متنی را «ذخیره تغییرات» بزنید.
          </p>
        </aside>

        <div className="min-w-0 rounded-2xl border border-theme p-5 sm:p-6">
          <header className="mb-6 border-b border-theme pb-4">
            <h2 className="text-lg font-semibold">{sectionMeta?.label}</h2>
            {sectionMeta?.description ? (
              <p className="mt-1 text-sm text-muted">{sectionMeta.description}</p>
            ) : null}
            {sectionMeta?.hint ? (
              <p className="mt-2 rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--accent)]">
                {sectionMeta.hint}
              </p>
            ) : null}
          </header>

          {selected === "carousel" && bundle ? (
            <HomepageBannerEditor
              items={bundle.banners_hero}
              defaultPlacement="hero"
              token={token()}
              onChange={load}
            />
          ) : null}

          {selected === "hero" ? (
            <div className="grid max-w-xl gap-4">
              <label className="grid gap-1 text-sm">
                برچسب
                <input
                  className={inputClass}
                  value={draft.hero.badge}
                  onChange={(e) => setDraft({ ...draft, hero: { ...draft.hero, badge: e.target.value } })}
                />
              </label>
              <label className="grid gap-1 text-sm">
                عنوان اصلی
                <input
                  className={inputClass}
                  value={draft.hero.title}
                  onChange={(e) => setDraft({ ...draft, hero: { ...draft.hero, title: e.target.value } })}
                />
              </label>
              <label className="grid gap-1 text-sm">
                زیرعنوان
                <textarea
                  rows={3}
                  className={inputClass}
                  value={draft.hero.subtitle}
                  onChange={(e) => setDraft({ ...draft, hero: { ...draft.hero, subtitle: e.target.value } })}
                />
              </label>
              <fieldset className="grid gap-3 rounded-xl border border-theme p-4">
                <legend className="px-1 text-xs font-medium text-muted">دکمهٔ اصلی</legend>
                <input
                  placeholder="متن"
                  className={inputClass}
                  value={draft.hero.primary_cta.label}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      hero: { ...draft.hero, primary_cta: { ...draft.hero.primary_cta, label: e.target.value } },
                    })
                  }
                />
                <input
                  placeholder="لینک"
                  dir="ltr"
                  className={inputClass}
                  value={draft.hero.primary_cta.href}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      hero: { ...draft.hero, primary_cta: { ...draft.hero.primary_cta, href: e.target.value } },
                    })
                  }
                />
              </fieldset>
              <fieldset className="grid gap-3 rounded-xl border border-theme p-4">
                <legend className="px-1 text-xs font-medium text-muted">دکمهٔ ثانویه</legend>
                <input
                  className={inputClass}
                  value={draft.hero.secondary_cta.label}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      hero: { ...draft.hero, secondary_cta: { ...draft.hero.secondary_cta, label: e.target.value } },
                    })
                  }
                />
                <input
                  dir="ltr"
                  className={inputClass}
                  value={draft.hero.secondary_cta.href}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      hero: { ...draft.hero, secondary_cta: { ...draft.hero.secondary_cta, href: e.target.value } },
                    })
                  }
                />
              </fieldset>
              <fieldset className="grid gap-3 rounded-xl border border-theme p-4">
                <legend className="px-1 text-xs font-medium text-muted">لینک همه دسته‌ها (دسکتاپ)</legend>
                <input
                  className={inputClass}
                  value={draft.hero.categories_link_label}
                  onChange={(e) =>
                    setDraft({ ...draft, hero: { ...draft.hero, categories_link_label: e.target.value } })
                  }
                />
                <input
                  dir="ltr"
                  className={inputClass}
                  value={draft.hero.categories_link_href}
                  onChange={(e) =>
                    setDraft({ ...draft, hero: { ...draft.hero, categories_link_href: e.target.value } })
                  }
                />
              </fieldset>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.hero.show_categories_bento}
                  onChange={(e) =>
                    setDraft({ ...draft, hero: { ...draft.hero, show_categories_bento: e.target.checked } })
                  }
                />
                نمایش شبکهٔ دسته‌بندی
              </label>
              <label className="grid gap-1 text-sm">
                حداکثر دسته در هیرو ({draft.hero.category_limit})
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={draft.hero.category_limit}
                  onChange={(e) =>
                    setDraft({ ...draft, hero: { ...draft.hero, category_limit: Number(e.target.value) } })
                  }
                />
              </label>
              <Link href="/admin/categories" className="text-sm text-[var(--accent)] hover:underline">
                مدیریت دسته‌بندی‌ها ←
              </Link>
            </div>
          ) : null}

          {selected === "featured" ? (
            <div className="grid max-w-xl gap-4">
              <label className="grid gap-1 text-sm">
                عنوان بخش
                <input
                  className={inputClass}
                  value={draft.featured.title}
                  onChange={(e) => setDraft({ ...draft, featured: { ...draft.featured, title: e.target.value } })}
                />
              </label>
              <label className="grid gap-1 text-sm">
                زیرعنوان
                <input
                  className={inputClass}
                  value={draft.featured.subtitle}
                  onChange={(e) => setDraft({ ...draft, featured: { ...draft.featured, subtitle: e.target.value } })}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  متن لینک کاتالوگ
                  <input
                    className={inputClass}
                    value={draft.featured.catalog_label}
                    onChange={(e) =>
                      setDraft({ ...draft, featured: { ...draft.featured, catalog_label: e.target.value } })
                    }
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  آدرس کاتالوگ
                  <input
                    dir="ltr"
                    className={inputClass}
                    value={draft.featured.catalog_href}
                    onChange={(e) =>
                      setDraft({ ...draft, featured: { ...draft.featured, catalog_href: e.target.value } })
                    }
                  />
                </label>
              </div>
              <label className="grid gap-1 text-sm">
                تعداد محصول ({draft.featured.product_count})
                <input
                  type="range"
                  min={2}
                  max={24}
                  step={1}
                  value={draft.featured.product_count}
                  onChange={(e) =>
                    setDraft({ ...draft, featured: { ...draft.featured, product_count: Number(e.target.value) } })
                  }
                />
              </label>
              <label className="grid gap-1 text-sm">
                فیلتر دسته (اختیاری — slug ریشه)
                <input
                  dir="ltr"
                  placeholder="مثلاً tshirt"
                  className={inputClass}
                  value={draft.featured.parent_slug ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      featured: { ...draft.featured, parent_slug: e.target.value.trim() || null },
                    })
                  }
                />
              </label>
            </div>
          ) : null}

          {selected === "promo" && bundle ? (
            <div className="space-y-6">
              <label className="flex items-center gap-2 rounded-xl border border-theme px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={draft.show_promo_fallback}
                  onChange={(e) => setDraft({ ...draft, show_promo_fallback: e.target.checked })}
                />
                اگر بنر promo نباشد، بخش‌های پیش‌فرض (سفارش سازمانی + Design Lab) نمایش داده شوند
              </label>
              <HomepageBannerEditor
                items={bundle.banners_promo}
                defaultPlacement="promo"
                token={token()}
                onChange={load}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

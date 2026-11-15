"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Puck, type Data } from "@puckeditor/core";
import "@puckeditor/core/puck.css";

import { adminFetch } from "@/lib/api";
import {
  adminToken,
  createBuilderPage,
  deleteBuilderPage,
  fetchBuilderPage,
  fetchBuilderPages,
  isAuthError,
  revalidateShopCache,
} from "@/lib/page-builder";
import { setAdminToken } from "@/lib/cart-session";
import { puckConfig } from "@/puck/config";
import { DEFAULT_HOME_PUCK_DATA, emptyPageData } from "@/puck/default-data";
import { migratePuckData } from "@/puck/style";
import type {
  PageBuilderListItem,
  PageBuilderPublic,
  PuckMetadata,
  PuckPageData,
} from "@/puck/types";
import {
  APPEARANCE_FIELDS,
  DEFAULT_APPEARANCE,
  sanitizeAppearance,
  type ThemeAppearance,
} from "@/puck/appearance";
import { ThemeAppearanceStyle } from "@/puck/ThemeAppearanceStyle";

type Props = {
  initial: PageBuilderPublic;
  metadata: PuckMetadata;
  initialPages?: PageBuilderListItem[];
};

const VIEWPORTS = [
  { width: 360, height: "auto" as const, label: "موبایل", icon: "Smartphone" as const },
  { width: 768, height: "auto" as const, label: "تبلت", icon: "Tablet" as const },
  { width: 1280, height: "auto" as const, label: "دسکتاپ", icon: "Monitor" as const },
];

export function PuckEditorClient({ initial, metadata, initialPages }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"layout" | "appearance">("layout");
  const [slug, setSlug] = useState(initial.slug || "home");
  const [pages, setPages] = useState<PageBuilderListItem[]>(
    initialPages?.length
      ? initialPages
      : [{ slug: "home", title: "صفحه اصلی", published: true }],
  );
  const [data, setData] = useState<PuckPageData>(
    migratePuckData(
      (initial.data as PuckPageData) || DEFAULT_HOME_PUCK_DATA,
    ) as PuckPageData,
  );
  const [appearance, setAppearance] = useState<ThemeAppearance>(
    sanitizeAppearance(initial.appearance || DEFAULT_APPEARANCE),
  );
  const [saving, setSaving] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const editorMeta = useMemo<PuckMetadata>(
    () => ({ ...metadata, editing: true }),
    [metadata],
  );

  const kickToLogin = useCallback(() => {
    setAdminToken(null);
    router.replace("/admin/login");
  }, [router]);

  const refreshPages = useCallback(async () => {
    const token = adminToken();
    try {
      const list = await fetchBuilderPages(token);
      setPages(list);
    } catch (e) {
      if (isAuthError(e)) kickToLogin();
    }
  }, [kickToLogin]);

  useEffect(() => {
    refreshPages();
  }, [refreshPages]);

  const switchPage = useCallback(
    async (nextSlug: string) => {
      if (nextSlug === slug) return;
      setLoadingPage(true);
      setMsg(null);
      const token = adminToken();
      try {
        const page = await fetchBuilderPage(token, nextSlug);
        setSlug(page.slug);
        setData(
          migratePuckData(
            (page.data as PuckPageData) || emptyPageData(page.title || nextSlug),
          ) as PuckPageData,
        );
        if (page.appearance) {
          setAppearance(sanitizeAppearance(page.appearance));
        }
        setTab("layout");
      } catch (e) {
        if (isAuthError(e)) {
          kickToLogin();
          return;
        }
        setMsg(e instanceof Error ? e.message : "بارگذاری صفحه ناموفق");
      } finally {
        setLoadingPage(false);
      }
    },
    [slug, kickToLogin],
  );

  const publish = useCallback(
    async (next: Data) => {
      setSaving(true);
      setMsg(null);
      const token = adminToken();
      try {
        const migrated = migratePuckData(next);
        const saved = await adminFetch<PageBuilderPublic>(
          `/api/v1/admin/page-builder/pages/${encodeURIComponent(slug)}`,
          token,
          {
            method: "PUT",
            body: JSON.stringify({ data: migrated, published: true }),
          },
        );
        setData(migratePuckData(saved.data as PuckPageData) as PuckPageData);
        await revalidateShopCache(token, slug).catch(() => undefined);
        await refreshPages();
        setMsg(
          slug === "home"
            ? "چیدمان صفحه اصلی ذخیره و منتشر شد"
            : `صفحه «${slug}» ذخیره شد — /p/${slug}`,
        );
      } catch (e) {
        if (isAuthError(e)) {
          kickToLogin();
          return;
        }
        setMsg(e instanceof Error ? e.message : "خطا در ذخیره");
      } finally {
        setSaving(false);
      }
    },
    [kickToLogin, slug, refreshPages],
  );

  async function saveAppearance() {
    setSaving(true);
    setMsg(null);
    const token = adminToken();
    const payload = sanitizeAppearance(appearance);
    try {
      const saved = await adminFetch<ThemeAppearance>(
        "/api/v1/admin/page-builder/appearance",
        token,
        { method: "PATCH", body: JSON.stringify(payload) },
      );
      setAppearance(sanitizeAppearance(saved));
      await revalidateShopCache(token, slug).catch(() => undefined);
      setMsg("ظاهر ذخیره شد — در فروشگاه اعمال می‌شود");
    } catch (e) {
      if (isAuthError(e)) {
        kickToLogin();
        return;
      }
      setMsg(e instanceof Error ? e.message : "خطا در ذخیره ظاهر");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    const s = newSlug.trim().toLowerCase();
    const t = newTitle.trim();
    if (!s || !t) {
      setMsg("slug و عنوان لازم است");
      return;
    }
    setSaving(true);
    setMsg(null);
    const token = adminToken();
    try {
      const created = await createBuilderPage(token, { slug: s, title: t });
      await refreshPages();
      setShowCreate(false);
      setNewSlug("");
      setNewTitle("");
      setSlug(created.slug);
      setData(
        migratePuckData(created.data as PuckPageData) as PuckPageData,
      );
      setMsg(`صفحه «${created.slug}» ساخته شد`);
    } catch (e) {
      if (isAuthError(e)) {
        kickToLogin();
        return;
      }
      setMsg(e instanceof Error ? e.message : "ساخت صفحه ناموفق");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (slug === "home") return;
    if (!window.confirm(`صفحه «${slug}» حذف شود؟`)) return;
    setSaving(true);
    setMsg(null);
    const token = adminToken();
    try {
      await deleteBuilderPage(token, slug);
      await refreshPages();
      await switchPage("home");
      setMsg("صفحه حذف شد");
    } catch (e) {
      if (isAuthError(e)) {
        kickToLogin();
        return;
      }
      setMsg(e instanceof Error ? e.message : "حذف ناموفق");
    } finally {
      setSaving(false);
    }
  }

  const previewHref = slug === "home" ? "/" : `/p/${slug}`;
  const currentTitle =
    pages.find((p) => p.slug === slug)?.title ||
    (data.root?.props as { title?: string } | undefined)?.title ||
    slug;

  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--bg)] text-[var(--fg)]" dir="rtl">
      <ThemeAppearanceStyle appearance={appearance} />
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-theme bg-card px-3 py-2 sm:gap-3 sm:px-4">
        <Link href="/admin" className="text-sm text-muted hover:text-[var(--accent)]">
          ← ادمین
        </Link>
        <h1 className="text-sm font-bold sm:text-base">صفحه‌ساز</h1>

        <label className="flex items-center gap-1.5 text-xs">
          <span className="text-muted">صفحه</span>
          <select
            className="input-theme min-h-8 rounded-lg px-2 text-xs"
            value={slug}
            disabled={loadingPage || saving}
            onChange={(e) => switchPage(e.target.value)}
          >
            {pages.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.title} ({p.slug})
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="rounded-lg border border-theme px-2.5 py-1.5 text-xs hover:border-[var(--accent)]"
          onClick={() => setShowCreate((v) => !v)}
        >
          صفحه جدید
        </button>
        {slug !== "home" ? (
          <button
            type="button"
            className="rounded-lg border border-theme px-2.5 py-1.5 text-xs text-danger hover:border-danger"
            onClick={handleDelete}
            disabled={saving}
          >
            حذف
          </button>
        ) : null}

        <div className="ms-auto flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-theme p-0.5 text-xs">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 ${tab === "layout" ? "bg-[var(--accent)] text-[var(--accent-fg)]" : ""}`}
              onClick={() => setTab("layout")}
            >
              چیدمان
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 ${tab === "appearance" ? "bg-[var(--accent)] text-[var(--accent-fg)]" : ""}`}
              onClick={() => setTab("appearance")}
            >
              ظاهر سراسری
            </button>
          </div>
          <Link
            href="/admin/homepage"
            className="rounded-lg border border-theme px-3 py-1.5 text-xs hover:border-[var(--accent)]"
          >
            بنرها و منبع محصول
          </Link>
          <Link
            href={previewHref}
            target="_blank"
            className="rounded-lg border border-theme px-3 py-1.5 text-xs hover:border-[var(--accent)]"
          >
            پیش‌نمایش
          </Link>
          {msg ? <span className="text-xs text-[var(--accent)]">{msg}</span> : null}
          {saving || loadingPage ? (
            <span className="text-xs text-muted">
              {loadingPage ? "بارگذاری…" : "در حال ذخیره…"}
            </span>
          ) : null}
        </div>
      </header>

      {showCreate ? (
        <div className="flex flex-wrap items-end gap-2 border-b border-theme bg-card px-3 py-3 sm:px-4">
          <label className="flex flex-col gap-1 text-xs">
            <span>عنوان</span>
            <input
              className="input-theme min-h-9 rounded-lg px-3"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="مثلاً درباره ما"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span>slug (انگلیسی)</span>
            <input
              className="input-theme min-h-9 rounded-lg px-3 font-mono"
              value={newSlug}
              onChange={(e) =>
                setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
              }
              placeholder="about"
            />
          </label>
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="min-h-9 rounded-lg bg-[var(--accent)] px-4 text-xs font-bold text-[var(--accent-fg)] disabled:opacity-60"
          >
            ساخت
          </button>
          <p className="w-full text-[11px] text-muted">
            آدرس عمومی: /p/{newSlug || "…"}
          </p>
        </div>
      ) : null}

      <div
        className={
          tab === "appearance"
            ? "mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-4 sm:p-6"
            : "hidden"
        }
      >
        <p className="mb-4 text-sm text-muted">
          رنگ‌ها و عرض فروشگاه روی کل سایت اعمال می‌شود (CSS variables). برای CSS فقط همین
          صفحه، از تب «صفحه» در پنل فیلدهای چیدمان یا فیلد پیشرفته بلوک استفاده کنید.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {APPEARANCE_FIELDS.map(({ key, label, type }) => (
            <label key={key} className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{label}</span>
              <div className="flex items-center gap-2">
                {type === "color" ? (
                  <input
                    type="color"
                    value={normalizeColor(appearance[key])}
                    onChange={(e) =>
                      setAppearance((a) => ({ ...a, [key]: e.target.value }))
                    }
                    className="h-10 w-12 cursor-pointer rounded border border-theme bg-transparent"
                  />
                ) : null}
                <input
                  type="text"
                  value={appearance[key]}
                  onChange={(e) =>
                    setAppearance((a) => ({ ...a, [key]: e.target.value }))
                  }
                  className="input-theme min-h-10 flex-1 rounded-lg px-3 text-sm"
                />
              </div>
            </label>
          ))}
        </div>
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={saveAppearance}
            disabled={saving}
            className="rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-bold text-[var(--accent-fg)] disabled:opacity-60"
          >
            ذخیره ظاهر
          </button>
          <button
            type="button"
            onClick={() => setAppearance(DEFAULT_APPEARANCE)}
            className="rounded-xl border border-theme px-6 py-2.5 text-sm"
          >
            بازگردانی پیش‌فرض نارنجی
          </button>
        </div>
        <div className="mt-10 overflow-hidden rounded-2xl border border-theme">
          <div
            className="p-6 text-white"
            style={{
              background: `linear-gradient(115deg, ${appearance.amazing_from}, ${appearance.amazing_to})`,
            }}
          >
            <p className="text-xs opacity-90">پیش‌نمایش گرادیان شگفت</p>
            <p className="mt-2 text-xl font-bold">پیشنهاد شگفت‌انگیز</p>
          </div>
          <div className="flex gap-3 p-4" style={{ background: appearance.bg }}>
            <div
              className="rounded-xl px-4 py-3 text-sm font-bold"
              style={{ background: appearance.accent, color: appearance.accent_fg }}
            >
              دکمه اصلی
            </div>
            <div
              className="rounded-xl border px-4 py-3 text-sm"
              style={{
                borderColor: appearance.border,
                color: appearance.fg,
                background: appearance.card,
              }}
            >
              کارت نمونه
            </div>
          </div>
        </div>
      </div>

      <div className={tab === "layout" ? "min-h-0 flex-1 [&_.Puck]:h-full" : "hidden"}>
        <Puck
          key={slug}
          config={puckConfig}
          data={data}
          onChange={(next) => setData(migratePuckData(next) as PuckPageData)}
          onPublish={publish}
          metadata={editorMeta}
          headerTitle={`چیدمان: ${currentTitle}`}
          viewports={VIEWPORTS}
          iframe={{ enabled: true }}
        />
      </div>
    </div>
  );
}

function normalizeColor(v: string) {
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#ff6a00";
}

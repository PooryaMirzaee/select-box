"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Puck, type Data } from "@puckeditor/core";
import "@puckeditor/core/puck.css";

import { adminFetch } from "@/lib/api";
import { adminToken, isAuthError, revalidateShopCache } from "@/lib/page-builder";
import { setAdminToken } from "@/lib/cart-session";
import { puckConfig } from "@/puck/config";
import { DEFAULT_HOME_PUCK_DATA } from "@/puck/default-data";
import type { PageBuilderPublic, PuckMetadata, PuckPageData } from "@/puck/types";
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
};

export function PuckEditorClient({ initial, metadata }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"layout" | "appearance">("layout");
  const [data, setData] = useState<PuckPageData>(
    (initial.data as PuckPageData) || DEFAULT_HOME_PUCK_DATA,
  );
  const [appearance, setAppearance] = useState<ThemeAppearance>(
    sanitizeAppearance(initial.appearance || DEFAULT_APPEARANCE),
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const editorMeta = useMemo<PuckMetadata>(
    () => ({ ...metadata, editing: true }),
    [metadata],
  );

  const kickToLogin = useCallback(() => {
    setAdminToken(null);
    router.replace("/admin/login");
  }, [router]);

  const publish = useCallback(
    async (next: Data) => {
      setSaving(true);
      setMsg(null);
      const token = adminToken();
      try {
        const saved = await adminFetch<PageBuilderPublic>(
          "/api/v1/admin/page-builder/pages/home",
          token,
          {
            method: "PUT",
            body: JSON.stringify({ data: next, published: true }),
          },
        );
        setData(saved.data as PuckPageData);
        await revalidateShopCache(token).catch(() => undefined);
        setMsg("چیدمان ذخیره و منتشر شد");
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
    [kickToLogin],
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
      await revalidateShopCache(token).catch(() => undefined);
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

  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--bg)] text-[var(--fg)]" dir="rtl">
      <ThemeAppearanceStyle appearance={appearance} />
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-theme bg-card px-3 py-2 sm:px-4">
        <Link href="/admin" className="text-sm text-muted hover:text-[var(--accent)]">
          ← ادمین
        </Link>
        <h1 className="text-sm font-bold sm:text-base">صفحه‌ساز فروشگاه</h1>
        <span className="hidden text-xs text-muted sm:inline">Puck</span>
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
              ظاهر
            </button>
          </div>
          <Link
            href="/admin/homepage"
            className="rounded-lg border border-theme px-3 py-1.5 text-xs hover:border-[var(--accent)]"
          >
            بنرها و منبع محصول
          </Link>
          <Link
            href="/"
            target="_blank"
            className="rounded-lg border border-theme px-3 py-1.5 text-xs hover:border-[var(--accent)]"
          >
            پیش‌نمایش سایت
          </Link>
          {msg ? <span className="text-xs text-[var(--accent)]">{msg}</span> : null}
          {saving ? <span className="text-xs text-muted">در حال ذخیره…</span> : null}
        </div>
      </header>

      {/* هر دو تب در DOM می‌مانند تا چیدمان ذخیره‌نشده از بین نرود */}
      <div className={tab === "appearance" ? "mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-4 sm:p-6" : "hidden"}>
        <p className="mb-4 text-sm text-muted">
          رنگ‌ها و عرض فروشگاه روی کل سایت اعمال می‌شود (CSS variables).
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
          config={puckConfig}
          data={data}
          onChange={(next) => setData(next as PuckPageData)}
          onPublish={publish}
          metadata={editorMeta}
          headerTitle="چیدمان صفحه اصلی"
          iframe={{ enabled: false }}
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

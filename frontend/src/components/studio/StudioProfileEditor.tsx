"use client";

import { useState } from "react";

import { StudioImageField } from "@/components/studio/StudioImageField";
import { Button } from "@/components/ui/Button";
import type { MyStudio } from "@/lib/studio";
import {
  removeStudioAvatar,
  removeStudioHeader,
  updateMyStudio,
  uploadStudioAvatar,
  uploadStudioHeader,
} from "@/lib/studio";
import { getAuthToken } from "@/lib/cart-session";

const ACCENT_PRESETS = ["#c45c26", "#2563eb", "#059669", "#7c3aed", "#db2777", "#0f766e"];

type Props = {
  data: MyStudio;
  onUpdated: (next: MyStudio) => void;
};

export function StudioProfileEditor({ data, onUpdated }: Props) {
  const [fullName, setFullName] = useState(data.full_name ?? "");
  const [slug, setSlug] = useState(
    data.profile.studio_slug !== String(data.profile.id) ? data.profile.studio_slug : "",
  );
  const [tagline, setTagline] = useState(data.profile.tagline ?? "");
  const [bio, setBio] = useState(data.profile.bio ?? "");
  const [accent, setAccent] = useState(data.profile.accent_hex);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);

  const token = () => getAuthToken();

  async function save() {
    const token = getAuthToken();
    if (!token) return;
    setSaving(true);
    setMsg(null);
    try {
      const next = await updateMyStudio(token, {
        full_name: fullName.trim() || null,
        studio_slug: slug.trim() || undefined,
        studio_tagline: tagline.trim() || null,
        studio_bio: bio.trim() || null,
        studio_accent_hex: accent,
      });
      onUpdated(next);
      setMsg("ذخیره شد");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-[var(--fg)] bg-[var(--bg-elevated)] p-6 shadow-[4px_4px_0_0_var(--fg)]">
      <h2 className="text-lg font-semibold">استودیوی من</h2>
      <p className="mt-1 text-sm text-muted">
        صفحهٔ عمومی شما — هدر، عکس پروفایل، نام، رنگ و متن را خودتان تنظیم کنید.
      </p>

      <div className="mt-4 space-y-4">
        <StudioImageField
          label="تصویر هدر"
          hint="بنر بالای صفحهٔ استودیو — پیشنهاد: عریض و افقی"
          aspect="banner"
          imageUrl={data.profile.header_url}
          uploading={uploadingHeader}
          onUpload={async (file) => {
            const t = token();
            if (!t) return;
            setUploadingHeader(true);
            try {
              const next = await uploadStudioHeader(t, file);
              onUpdated(next);
            } finally {
              setUploadingHeader(false);
            }
          }}
          onRemove={async () => {
            const t = token();
            if (!t) return;
            setUploadingHeader(true);
            try {
              const next = await removeStudioHeader(t);
              onUpdated(next);
            } finally {
              setUploadingHeader(false);
            }
          }}
        />

        <StudioImageField
          label="عکس پروفایل"
          hint="کنار نام شما در صفحهٔ استودیو نمایش داده می‌شود"
          aspect="square"
          imageUrl={data.profile.avatar_url}
          uploading={uploadingAvatar}
          onUpload={async (file) => {
            const t = token();
            if (!t) return;
            setUploadingAvatar(true);
            try {
              const next = await uploadStudioAvatar(t, file);
              onUpdated(next);
            } finally {
              setUploadingAvatar(false);
            }
          }}
          onRemove={async () => {
            const t = token();
            if (!t) return;
            setUploadingAvatar(true);
            try {
              const next = await removeStudioAvatar(t);
              onUpdated(next);
            } finally {
              setUploadingAvatar(false);
            }
          }}
        />

        <label className="block text-xs font-semibold uppercase text-muted">نام نمایشی</label>
        <input
          className="w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="نام یا نام هنری"
        />

        <label className="block text-xs font-semibold uppercase text-muted">آدرس استودیو (انگلیسی)</label>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-muted shrink-0">/studio/</span>
          <input
            className="min-w-0 flex-1 rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder={String(data.profile.id)}
          />
        </div>

        <label className="block text-xs font-semibold uppercase text-muted">جملهٔ کوتاه</label>
        <input
          className="w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="مثلاً چاپ دستی · سینما · مینیمال"
        />

        <label className="block text-xs font-semibold uppercase text-muted">درباره</label>
        <textarea
          rows={4}
          className="w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="داستان کار، سبک، علاقه‌مندی‌ها…"
        />

        <label className="block text-xs font-semibold uppercase text-muted">رنگ استودیو</label>
        <div className="flex flex-wrap gap-2">
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              className={`h-8 w-8 rounded-full border-2 ${accent === c ? "border-[var(--fg)] ring-2 ring-[var(--accent)]" : "border-transparent"}`}
              style={{ background: c }}
              aria-label={c}
              onClick={() => setAccent(c)}
            />
          ))}
          <input
            type="color"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-theme"
            aria-label="رنگ سفارشی"
          />
        </div>
      </div>

      {msg ? <p className="mt-3 text-sm text-[var(--accent)]">{msg}</p> : null}

      <Button className="mt-4 w-full" disabled={saving} onClick={() => void save()}>
        {saving ? "در حال ذخیره…" : "ذخیره استودیو"}
      </Button>
    </div>
  );
}

import Link from "next/link";

import type { StudioPublic } from "@/lib/studio";
import { studioPath } from "@/lib/studio";
import { mediaUrl } from "@/lib/media";

type Props = { studio: StudioPublic; index?: number };

export function StudioCard({ studio, index = 0 }: Props) {
  const accent = studio.accent_hex || "#c45c26";
  const img =
    mediaUrl(studio.header_url) ??
    studio.header_url ??
    mediaUrl(studio.preview_image_url) ??
    studio.preview_image_url;
  const avatar =
    mediaUrl(studio.avatar_url) ?? studio.avatar_url;

  return (
    <Link
      href={studioPath(studio)}
      className="group relative overflow-hidden rounded-2xl border-2 border-[var(--fg)] bg-[var(--bg-elevated)] shadow-[4px_4px_0_0_var(--fg)] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--fg)]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="aspect-[4/3] overflow-hidden bg-[var(--input-bg)]">
        {img ? (
          <img
            src={img}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-4xl font-bold opacity-30"
            style={{ color: accent }}
          >
            {studio.display_name.charAt(0)}
          </div>
        )}
      </div>
      <div className="relative p-4 pt-5">
        {avatar ? (
          <img
            src={avatar}
            alt=""
            className="absolute -top-8 end-4 h-14 w-14 rounded-xl border-2 border-[var(--fg)] object-cover shadow-[2px_2px_0_0_var(--fg)]"
          />
        ) : null}
        <h2 className="text-lg font-semibold leading-tight group-hover:text-[var(--accent)] pe-16">
          {studio.display_name}
        </h2>
        {studio.tagline ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{studio.tagline}</p>
        ) : studio.bio ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{studio.bio}</p>
        ) : null}
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted">
          {studio.product_count > 0
            ? `${studio.product_count} اثر در ویترین`
            : "استودیوی خالق"}
        </p>
      </div>
    </Link>
  );
}

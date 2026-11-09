import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { apiBase } from "@/lib/api-base";

const ALLOWED_TAGS = new Set([
  "page-builder",
  "page-builder-home",
  "theme-appearance",
  "homepage",
  "home-banners",
  "home-banners-hero",
  "home-banners-promo",
  "home-banners-all",
]);

/**
 * پس از انتشار صفحه‌ساز / ظاهر — کش Next را تازه می‌کند.
 * نیاز به JWT ادمین معتبر دارد.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json({ detail: "نشست نامعتبر" }, { status: 401 });
  }

  try {
    const probe = await fetch(`${apiBase()}/api/v1/admin/page-builder/appearance`, {
      headers: { Authorization: auth },
      cache: "no-store",
    });
    if (probe.status === 401 || probe.status === 403) {
      return NextResponse.json({ detail: "نشست منقضی شده" }, { status: 401 });
    }
    if (!probe.ok) {
      return NextResponse.json({ detail: "تأیید ادمین ناموفق" }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ detail: "اتصال به API برقرار نشد" }, { status: 502 });
  }

  let tags: string[] = ["page-builder", "page-builder-home", "theme-appearance"];
  let paths: string[] = ["/"];
  try {
    const body = (await req.json()) as { tags?: string[]; paths?: string[] };
    if (Array.isArray(body.tags) && body.tags.length) {
      tags = body.tags.filter((t) => ALLOWED_TAGS.has(t));
    }
    if (Array.isArray(body.paths) && body.paths.length) {
      paths = body.paths.filter((p) => typeof p === "string" && p.startsWith("/"));
    }
  } catch {
    /* keep defaults */
  }

  for (const tag of tags) revalidateTag(tag);
  for (const path of paths) revalidatePath(path);

  return NextResponse.json({ ok: true, tags, paths });
}

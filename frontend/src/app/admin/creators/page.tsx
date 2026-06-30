"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Check, ExternalLink, Eye } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { adminFetch } from "@/lib/api";
import {
  fetchAdminCreators,
  fetchCreatorSubmissions,
  type CreatorSubmission,
  type UserAdmin,
} from "@/lib/admin-users";
import { formatToman } from "@/lib/utils";

type Tab = "creators" | "submissions";

export default function AdminCreatorsPage() {
  const [tab, setTab] = useState<Tab>("submissions");
  const [creators, setCreators] = useState<UserAdmin[]>([]);
  const [submissions, setSubmissions] = useState<CreatorSubmission[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const token = () => localStorage.getItem("coralay_admin_token")!;

  const load = useCallback(() => {
    setLoading(true);
    setMsg(null);
    const t = token();
    Promise.all([
      fetchAdminCreators(t, q || undefined),
      fetchCreatorSubmissions(t, "draft"),
    ])
      .then(([c, s]) => {
        setCreators(c.items);
        setSubmissions(s.items);
      })
      .catch((e) => setMsg(e instanceof Error ? e.message : "خطا"))
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  async function publishProduct(productId: number) {
    try {
      await adminFetch(`/api/v1/admin/products/${productId}/status`, token(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      setMsg("منتشر شد");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "خطا");
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold">خالقین</h1>
      <p className="mt-1 text-sm text-muted">مدیریت استودیوها و تأیید آثار در انتظار</p>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === "submissions" ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "border border-theme"}`}
          onClick={() => setTab("submissions")}
        >
          در انتظار تأیید ({submissions.length})
        </button>
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === "creators" ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "border border-theme"}`}
          onClick={() => setTab("creators")}
        >
          همه خالقین ({creators.length})
        </button>
      </div>

      {tab === "creators" ? (
        <div className="mt-4 flex gap-2">
          <input
            placeholder="جستجو…"
            className="flex-1 rounded-lg border border-theme px-3 py-2 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button variant="outline" size="sm" onClick={load}>
            جستجو
          </Button>
        </div>
      ) : null}

      {msg ? <p className="mt-4 text-sm text-[var(--accent)]">{msg}</p> : null}
      {loading ? <p className="mt-8 text-muted">...</p> : null}

      {tab === "submissions" && !loading ? (
        <div className="mt-6 space-y-4">
          {submissions.length === 0 ? (
            <p className="text-muted">اثری در انتظار تأیید نیست.</p>
          ) : (
            submissions.map((s) => (
              <div key={s.product_id} className="card-theme flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-xs text-muted">
                    خالق: {s.creator?.display_name} · {s.creator?.phone}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.creator ? (
                    <Link
                      href={`/studio/${s.creator.studio_slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-sm text-muted hover:text-[var(--fg)]"
                    >
                      <ExternalLink className="h-4 w-4" />
                      استودیو
                    </Link>
                  ) : null}
                  <Link href={`/admin/users/${s.creator?.id}`} className="text-sm text-[var(--accent)]">
                    <Eye className="inline h-4 w-4" />
                    پروفایل
                  </Link>
                  <Button size="sm" onClick={() => void publishProduct(s.product_id)}>
                    <Check className="ms-1 inline h-4 w-4" />
                    انتشار در ویترین
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {tab === "creators" && !loading ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-theme text-muted">
                <th className="py-2 text-start">خالق</th>
                <th className="py-2 text-start">آثار</th>
                <th className="py-2 text-start">منتشر</th>
                <th className="py-2 text-start">درآمد</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {creators.map((c) => (
                <tr key={c.id} className="border-b border-theme/60">
                  <td className="py-3">
                    <p className="font-medium">{c.display_name ?? c.full_name ?? c.phone}</p>
                    <p className="text-xs text-muted">{c.phone}</p>
                  </td>
                  <td>{c.product_count ?? 0}</td>
                  <td>{c.published_count ?? 0}</td>
                  <td>{formatToman(c.total_earned ?? "0")}</td>
                  <td className="text-end">
                    <Link href={`/admin/users/${c.id}`} className="text-[var(--accent)]">
                      مدیریت
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

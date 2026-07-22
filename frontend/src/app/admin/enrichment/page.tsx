"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { adminFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type Candidate = {
  id: number;
  image_url: string;
  source: string | null;
  score: number;
  local_url: string | null;
  is_selected: boolean;
};

type Job = {
  id: number;
  product_id: number;
  product_title: string;
  product_slug: string;
  design_code: string | null;
  status: string;
  query_used: string | null;
  description_draft: string | null;
  error: string | null;
  attempts: number;
  auto_apply: boolean;
  candidates: Candidate[];
};

type Stats = {
  pending: number;
  running: number;
  needs_review: number;
  approved: number;
  rejected: number;
  failed: number;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "در صف",
  running: "در حال اجرا",
  needs_review: "نیاز به تأیید",
  approved: "اعمال‌شده",
  rejected: "رد شده",
  failed: "ناموفق",
};

export default function AdminEnrichmentPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = () => localStorage.getItem("selectbox_admin_token")!;

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const q = filter ? `?status=${encodeURIComponent(filter)}&limit=80` : "?limit=80";
    Promise.all([
      adminFetch<Stats>("/api/v1/admin/enrichment/stats", token()),
      adminFetch<Job[]>(`/api/v1/admin/enrichment/jobs${q}`, token()),
    ])
      .then(([s, rows]) => {
        setStats(s);
        setJobs(rows);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "خطا"))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  async function approve(job: Job, candidateId?: number) {
    setBusy(true);
    try {
      await adminFetch(`/api/v1/admin/enrichment/jobs/${job.id}/approve`, token(), {
        method: "POST",
        body: JSON.stringify({
          candidate_id: candidateId ?? null,
          apply_description: true,
        }),
      });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "تأیید ناموفق");
    } finally {
      setBusy(false);
    }
  }

  async function reject(jobId: number) {
    setBusy(true);
    try {
      await adminFetch(`/api/v1/admin/enrichment/jobs/${jobId}/reject`, token(), {
        method: "POST",
        body: "{}",
      });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "رد ناموفق");
    } finally {
      setBusy(false);
    }
  }

  async function retry(jobId: number) {
    setBusy(true);
    try {
      await adminFetch(`/api/v1/admin/enrichment/jobs/${jobId}/retry`, token(), {
        method: "POST",
        body: "{}",
      });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "تلاش مجدد ناموفق");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">غنی‌سازی محصولات</h1>
          <p className="mt-2 text-sm text-muted">
            عکس و توضیح از وب — اجرا روی سرور، پنل گیر نمی‌کند. از صفحه محصولات چند کالا را انتخاب و صف کنید.
          </p>
        </div>
        <Link href="/admin/products">
          <Button variant="outline">رفتن به محصولات</Button>
        </Link>
      </div>

      {stats ? (
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          {(
            [
              ["", "همه"],
              ["pending", `صف (${stats.pending})`],
              ["running", `اجرا (${stats.running})`],
              ["needs_review", `تأیید (${stats.needs_review})`],
              ["approved", `اعمال (${stats.approved})`],
              ["failed", `ناموفق (${stats.failed})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key || "all"}
              type="button"
              className={cn("chip-theme", filter === key && "is-active")}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}
      {loading && !jobs.length ? <p className="mt-8 text-muted">بارگذاری…</p> : null}

      <div className="mt-6 space-y-4">
        {jobs.map((job) => (
          <div key={job.id} className="card-theme p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  #{job.id} — {job.product_title}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {STATUS_LABEL[job.status] || job.status}
                  {job.design_code ? ` · ${job.design_code}` : ""}
                  {job.query_used ? ` · «${job.query_used}»` : ""}
                </p>
                {job.error ? <p className="mt-2 text-sm text-red-500">{job.error}</p> : null}
                {job.description_draft ? (
                  <p className="mt-2 max-w-2xl text-sm text-muted">{job.description_draft}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {job.status === "needs_review" ? (
                  <>
                    <Button size="sm" disabled={busy} onClick={() => approve(job)}>
                      تأیید بهترین
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => reject(job.id)}>
                      رد
                    </Button>
                  </>
                ) : null}
                {job.status === "failed" || job.status === "rejected" ? (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => retry(job.id)}>
                    تلاش مجدد
                  </Button>
                ) : null}
                <Link href={`/admin/products/${job.product_id}/edit`}>
                  <Button size="sm" variant="ghost">
                    ویرایش محصول
                  </Button>
                </Link>
              </div>
            </div>
            {job.candidates.length ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {job.candidates.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={busy || job.status === "approved"}
                    className={cn(
                      "overflow-hidden rounded border border-theme",
                      c.is_selected && "ring-2 ring-emerald-500",
                    )}
                    onClick={() => {
                      if (job.status === "needs_review") approve(job, c.id);
                    }}
                    title="انتخاب و اعمال این عکس"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.local_url || c.image_url}
                      alt=""
                      className="h-24 w-24 object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {!loading && jobs.length === 0 ? (
          <p className="p-8 text-center text-muted">
            جابی نیست. از صفحه محصولات چند کالا را انتخاب و «دریافت عکس از وب» را بزنید.
          </p>
        ) : null}
      </div>
    </div>
  );
}

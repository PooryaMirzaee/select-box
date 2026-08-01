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
  mode: string;
  query_used: string | null;
  description_draft: string | null;
  category_draft_id: number | null;
  category_draft_name: string | null;
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

const MODE_LABEL: Record<string, string> = {
  images: "عکس",
  description: "توضیح",
  both: "عکس + توضیح",
  category: "دسته‌بندی",
};

function canApplyCandidate(job: Job) {
  return (
    job.candidates.length > 0 &&
    (job.status === "needs_review" || job.status === "approved" || job.status === "failed")
  );
}

function canApplyDescription(job: Job) {
  return (
    Boolean(job.description_draft) &&
    (job.mode === "description" || job.mode === "both") &&
    (job.status === "needs_review" || job.status === "approved" || job.status === "failed")
  );
}

function canApplyCategory(job: Job) {
  return (
    job.mode === "category" &&
    Boolean(job.category_draft_id) &&
    (job.status === "needs_review" || job.status === "approved" || job.status === "failed")
  );
}

/** جاب چیزی برای اعمال گروهی دارد؟ */
function canBulkApply(job: Job) {
  return canApplyCandidate(job) || canApplyDescription(job) || canApplyCategory(job);
}

export default function AdminEnrichmentPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const token = () => localStorage.getItem("selectbox_admin_token")!;

  const load = useCallback(() => {
    setError(null);
    const q = filter ? `?status=${encodeURIComponent(filter)}&limit=80` : "?limit=80";
    Promise.all([
      adminFetch<Stats>("/api/v1/admin/enrichment/stats", token()),
      adminFetch<Job[]>(`/api/v1/admin/enrichment/jobs${q}`, token()),
    ])
      .then(([s, rows]) => {
        setStats(s);
        setJobs(rows);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "خطا");
        setLoading(false);
      });
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    setSelected(new Set());
    load();
    const t = setInterval(() => {
      if (busyId == null && !bulkBusy) load();
    }, 5000);
    return () => clearInterval(t);
  }, [load, busyId, bulkBusy]);

  function toggleSelect(jobId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  const applyableJobs = jobs.filter(canBulkApply);
  const selectedApplyable = applyableJobs.filter((j) => selected.has(j.id));
  const selectedRetryable = jobs.filter(
    (j) => selected.has(j.id) && (j.status === "failed" || j.status === "rejected"),
  );
  const selectedRejectable = jobs.filter(
    (j) => selected.has(j.id) && j.status === "needs_review",
  );

  function selectAllApplyable() {
    setSelected((prev) => {
      const allSelected = applyableJobs.length > 0 && applyableJobs.every((j) => prev.has(j.id));
      if (allSelected) return new Set();
      return new Set(applyableJobs.map((j) => j.id));
    });
  }

  async function bulkAction(action: "approve" | "reject" | "retry", ids: number[]) {
    if (!ids.length) return;
    if (action === "approve" && !confirm(`اعمال ${ids.length} مورد به‌صورت گروهی؟ (بهترین عکس/توضیح/دسته هر جاب)`)) {
      return;
    }
    setBulkBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await adminFetch<{ done: number; failed: number; errors: string[] }>(
        "/api/v1/admin/enrichment/jobs/bulk",
        token(),
        { method: "POST", body: JSON.stringify({ job_ids: ids, action }) },
      );
      const verb = action === "approve" ? "اعمال" : action === "reject" ? "رد" : "تلاش مجدد";
      setNotice(
        `${verb} گروهی: ${res.done} موفق` +
          (res.failed ? ` — ${res.failed} ناموفق${res.errors.length ? ` (${res.errors[0]})` : ""}` : ""),
      );
      setSelected(new Set());
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "عملیات گروهی ناموفق");
    } finally {
      setBulkBusy(false);
    }
  }

  async function approve(job: Job, candidateId?: number, applyDescription = true) {
    setBusyId(job.id);
    setNotice(null);
    try {
      await adminFetch(`/api/v1/admin/enrichment/jobs/${job.id}/approve`, token(), {
        method: "POST",
        body: JSON.stringify({
          candidate_id: candidateId ?? null,
          apply_description: applyDescription,
        }),
      });
      const what =
        job.mode === "category"
          ? "دسته‌بندی"
          : job.mode === "description"
            ? "توضیح"
            : candidateId || job.mode === "images"
              ? "عکس"
              : "عکس/توضیح";
      setNotice(`${what} برای «${job.product_title}» اعمال شد`);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "تأیید ناموفق");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(jobId: number) {
    setBusyId(jobId);
    try {
      await adminFetch(`/api/v1/admin/enrichment/jobs/${jobId}/reject`, token(), {
        method: "POST",
        body: "{}",
      });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "رد ناموفق");
    } finally {
      setBusyId(null);
    }
  }

  async function retry(jobId: number) {
    setBusyId(jobId);
    try {
      await adminFetch(`/api/v1/admin/enrichment/jobs/${jobId}/retry`, token(), {
        method: "POST",
        body: "{}",
      });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "تلاش مجدد ناموفق");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">غنی‌سازی محصولات</h1>
          <p className="mt-2 text-sm text-muted">
            عکس را جداگانه یا توضیح کرال‌شده از وب را جداگانه اعمال کنید. توضیحات از دیجی‌کالا/ترب و AvalAI web
            search ساخته می‌شوند.
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

      {notice ? <p className="mt-4 text-sm text-emerald-600">{notice}</p> : null}
      {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}
      {loading && !jobs.length ? <p className="mt-8 text-muted">بارگذاری…</p> : null}

      {jobs.length > 0 ? (
        <div className="card-theme sticky top-2 z-10 mt-6 flex flex-wrap items-center gap-3 p-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--accent)]"
              checked={applyableJobs.length > 0 && applyableJobs.every((j) => selected.has(j.id))}
              onChange={selectAllApplyable}
            />
            انتخاب همه قابل‌اعمال‌ها ({applyableJobs.length.toLocaleString("fa-IR")})
          </label>
          {selected.size > 0 ? (
            <span className="text-sm text-muted">
              {selected.size.toLocaleString("fa-IR")} انتخاب شده
            </span>
          ) : null}
          <div className="ms-auto flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={bulkBusy || selectedApplyable.length === 0}
              onClick={() => bulkAction("approve", selectedApplyable.map((j) => j.id))}
            >
              {bulkBusy ? "…" : `اعمال گروهی (${selectedApplyable.length.toLocaleString("fa-IR")})`}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy || selectedRetryable.length === 0}
              onClick={() => bulkAction("retry", selectedRetryable.map((j) => j.id))}
            >
              تلاش مجدد ({selectedRetryable.length.toLocaleString("fa-IR")})
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy || selectedRejectable.length === 0}
              onClick={() => bulkAction("reject", selectedRejectable.map((j) => j.id))}
            >
              رد ({selectedRejectable.length.toLocaleString("fa-IR")})
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {jobs.map((job) => {
          const busy = busyId === job.id;
          const applyable = canApplyCandidate(job);
          const descApplyable = canApplyDescription(job);
          return (
            <div
              key={job.id}
              className={cn("card-theme p-4", selected.has(job.id) && "ring-2 ring-[var(--accent)]/50")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                    checked={selected.has(job.id)}
                    onChange={() => toggleSelect(job.id)}
                    aria-label={`انتخاب ${job.product_title}`}
                  />
                  <div>
                  <p className="font-medium">
                    #{job.id} — {job.product_title}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {STATUS_LABEL[job.status] || job.status}
                    {` · ${MODE_LABEL[job.mode] || job.mode || "both"}`}
                    {job.design_code ? ` · ${job.design_code}` : ""}
                    {job.query_used ? ` · «${job.query_used}»` : ""}
                  </p>
                  {job.error ? <p className="mt-2 text-sm text-red-500">{job.error}</p> : null}
                  {job.category_draft_name ? (
                    <p className="mt-2 text-sm">
                      <span className="text-muted">دسته پیشنهادی: </span>
                      <span className="font-medium text-[var(--accent)]">{job.category_draft_name}</span>
                    </p>
                  ) : null}
                  {job.description_draft ? (
                    <p className="mt-2 max-w-2xl text-sm text-muted">{job.description_draft}</p>
                  ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canApplyCategory(job) ? (
                    <Button size="sm" disabled={busy} onClick={() => approve(job, undefined, false)}>
                      {busy ? "…" : "اعمال دسته‌بندی"}
                    </Button>
                  ) : null}
                  {job.mode === "description" && descApplyable ? (
                    <Button size="sm" disabled={busy} onClick={() => approve(job, undefined, true)}>
                      {busy ? "…" : "اعمال توضیح"}
                    </Button>
                  ) : null}
                  {job.mode !== "description" && applyable ? (
                    <Button size="sm" disabled={busy} onClick={() => approve(job)}>
                      {busy ? "…" : "اعمال بهترین عکس"}
                    </Button>
                  ) : null}
                  {job.mode === "both" && descApplyable && !applyable ? (
                    <Button size="sm" disabled={busy} onClick={() => approve(job, undefined, true)}>
                      {busy ? "…" : "اعمال توضیح"}
                    </Button>
                  ) : null}
                  {job.status === "needs_review" ? (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => reject(job.id)}>
                      رد
                    </Button>
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
                      disabled={busy || !applyable}
                      className={cn(
                        "group relative overflow-hidden rounded border border-theme transition hover:ring-2 hover:ring-emerald-500",
                        c.is_selected && "ring-2 ring-emerald-500",
                        (!applyable || busy) && "opacity-60",
                      )}
                      onClick={() => approve(job, c.id)}
                      title="اعمال این عکس روی محصول"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.local_url || c.image_url}
                        alt=""
                        className="h-24 w-24 object-cover"
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100">
                        اعمال
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
        {!loading && jobs.length === 0 ? (
          <p className="p-8 text-center text-muted">
            جابی نیست. از صفحه محصولات چند کالا را انتخاب و «دریافت عکس» یا «کرال توضیح» را بزنید.
          </p>
        ) : null}
      </div>
    </div>
  );
}

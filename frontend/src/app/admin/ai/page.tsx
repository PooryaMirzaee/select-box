"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Loader2, Plus, Trash2, Wand } from "@/components/icons";
import {
  createAiSuggestedPrompt,
  createAiTool,
  deleteAiSuggestedPrompt,
  deleteAiTool,
  fetchAiAdminConfig,
  fetchAiLogs,
  fetchAiStats,
  fetchAiSuggestedPrompts,
  fetchAiTools,
  patchAiAdminConfig,
  updateAiSuggestedPrompt,
  updateAiTool,
  type AiAdminConfig,
  type AiLog,
  type AiStats,
  type AiSuggestedPromptAdmin,
  type AiToolAdmin,
} from "@/lib/aiAdmin";
import { mediaUrl } from "@/lib/media";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { cn } from "@/lib/utils";

type TabId = "overview" | "prompts" | "tools" | "config" | "logs";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "آمار" },
  { id: "prompts", label: "پیشنهاد متنی" },
  { id: "tools", label: "ابزار آماده" },
  { id: "config", label: "پرامپت سیستم" },
  { id: "logs", label: "لاگ‌ها" },
];

function fmt(n: number) {
  return new Intl.NumberFormat("fa-IR").format(n);
}

function fmtDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function emptyPromptForm() {
  return { text: "", label: "", sort_order: 0, enabled: true };
}

function emptyToolForm() {
  return { name: "", description: "", prompt: "", sort_order: 0, enabled: true };
}

export default function AdminAiPage() {
  const token = () => localStorage.getItem(STORAGE_KEYS.adminToken)!;
  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [stats, setStats] = useState<AiStats | null>(null);
  const [config, setConfig] = useState<AiAdminConfig | null>(null);
  const [prompts, setPrompts] = useState<AiSuggestedPromptAdmin[]>([]);
  const [tools, setTools] = useState<AiToolAdmin[]>([]);
  const [logs, setLogs] = useState<AiLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logSearch, setLogSearch] = useState("");
  const [logStatus, setLogStatus] = useState<"" | "success" | "failed">("");

  const [newPrompt, setNewPrompt] = useState(emptyPromptForm);
  const [editingPromptId, setEditingPromptId] = useState<number | null>(null);
  const [editPromptForm, setEditPromptForm] = useState(emptyPromptForm);

  const [newTool, setNewTool] = useState(emptyToolForm);
  const [editingToolId, setEditingToolId] = useState<number | null>(null);
  const [editToolForm, setEditToolForm] = useState(emptyToolForm);

  const loadOverview = useCallback(async () => {
    const [s, c] = await Promise.all([fetchAiStats(token()), fetchAiAdminConfig(token())]);
    setStats(s);
    setConfig(c);
  }, []);

  const loadPrompts = useCallback(async () => {
    setPrompts(await fetchAiSuggestedPrompts(token()));
  }, []);

  const loadTools = useCallback(async () => {
    setTools(await fetchAiTools(token()));
  }, []);

  const loadLogs = useCallback(async () => {
    const data = await fetchAiLogs(token(), {
      page: logsPage,
      page_size: 25,
      status: logStatus || undefined,
      search: logSearch.trim() || undefined,
    });
    setLogs(data.items);
    setLogsTotal(data.total);
  }, [logsPage, logSearch, logStatus]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      await Promise.all([loadOverview(), loadPrompts(), loadTools(), loadLogs()]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "خطا در بارگذاری");
    } finally {
      setLoading(false);
    }
  }, [loadOverview, loadPrompts, loadTools, loadLogs]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (tab === "logs") void loadLogs();
  }, [tab, loadLogs]);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const updated = await patchAiAdminConfig(token(), {
        system_prompt_suffix: config.system_prompt_suffix,
      });
      setConfig(updated);
      setMessage("تنظیمات ذخیره شد");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  };

  const addPrompt = async () => {
    if (!newPrompt.text.trim()) return;
    setSaving(true);
    try {
      await createAiSuggestedPrompt(token(), {
        text: newPrompt.text.trim(),
        label: newPrompt.label.trim() || null,
        sort_order: newPrompt.sort_order,
        enabled: newPrompt.enabled,
      });
      setNewPrompt(emptyPromptForm());
      await loadPrompts();
      setMessage("پیشنهاد اضافه شد");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  };

  const saveEditPrompt = async () => {
    if (editingPromptId === null || !editPromptForm.text.trim()) return;
    setSaving(true);
    try {
      await updateAiSuggestedPrompt(token(), editingPromptId, {
        text: editPromptForm.text.trim(),
        label: editPromptForm.label.trim() || null,
        sort_order: editPromptForm.sort_order,
        enabled: editPromptForm.enabled,
      });
      setEditingPromptId(null);
      await loadPrompts();
      setMessage("پیشنهاد به‌روز شد");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  };

  const removePrompt = async (id: number) => {
    if (!confirm("این پیشنهاد حذف شود؟")) return;
    await deleteAiSuggestedPrompt(token(), id);
    await loadPrompts();
  };

  const addTool = async () => {
    if (!newTool.name.trim() || !newTool.prompt.trim()) return;
    setSaving(true);
    try {
      await createAiTool(token(), {
        name: newTool.name.trim(),
        description: newTool.description.trim() || null,
        prompt: newTool.prompt.trim(),
        sort_order: newTool.sort_order,
        enabled: newTool.enabled,
      });
      setNewTool(emptyToolForm());
      await loadTools();
      setMessage("ابزار اضافه شد");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  };

  const saveEditTool = async () => {
    if (editingToolId === null || !editToolForm.name.trim() || !editToolForm.prompt.trim()) return;
    setSaving(true);
    try {
      await updateAiTool(token(), editingToolId, {
        name: editToolForm.name.trim(),
        description: editToolForm.description.trim() || null,
        prompt: editToolForm.prompt.trim(),
        sort_order: editToolForm.sort_order,
        enabled: editToolForm.enabled,
      });
      setEditingToolId(null);
      await loadTools();
      setMessage("ابزار به‌روز شد");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  };

  const removeTool = async (id: number) => {
    if (!confirm("این ابزار حذف شود؟")) return;
    await deleteAiTool(token(), id);
    await loadTools();
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Wand className="h-6 w-6" />
            طراحی هوشمند
          </h1>
          <p className="mt-1 text-sm text-muted">
            پیشنهادهای متنی، ابزارهای تبدیل عکس و مشاهده لاگ‌ها
          </p>
        </div>
        <Link href="/admin/settings" className="text-sm text-muted underline hover:text-foreground">
          تنظیمات API و سقف مصرف ←
        </Link>
      </div>

      {message ? (
        <p className="rounded-xl border border-theme bg-[var(--input-bg)] px-4 py-2 text-sm">{message}</p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-theme pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={cn(
              "rounded-lg px-4 py-2 text-sm transition-colors",
              tab === t.id ? "bg-[var(--accent)] text-white" : "text-muted hover:bg-[var(--bg-muted)]",
            )}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && stats ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "کل درخواست‌ها (۳۰ روز)", value: stats.total },
              { label: "موفق", value: stats.success },
              { label: "ناموفق", value: stats.failed },
              { label: "امروز", value: stats.today },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-theme p-5">
                <p className="text-sm text-muted">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold">{fmt(card.value)}</p>
              </div>
            ))}
          </div>
          <section className="rounded-2xl border border-theme p-6">
            <h2 className="font-medium">پرکاربردترین پرامپت‌ها</h2>
            {stats.top_prompts.length ? (
              <ul className="mt-4 space-y-2 text-sm">
                {stats.top_prompts.map((item) => (
                  <li key={item.prompt} className="flex justify-between gap-2">
                    <span className="truncate" title={item.prompt}>
                      {item.prompt}
                    </span>
                    <span className="shrink-0 text-muted">{fmt(item.count)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted">هنوز داده‌ای نیست</p>
            )}
          </section>
        </div>
      ) : null}

      {tab === "prompts" ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-theme p-6">
            <h2 className="font-medium">پیشنهاد متنی جدید</h2>
            <p className="mt-1 text-xs text-muted">برای ساخت طرح از روی توضیح متنی در Design Lab</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm"
                placeholder="متن پرامپت"
                value={newPrompt.text}
                onChange={(e) => setNewPrompt({ ...newPrompt, text: e.target.value })}
              />
              <input
                className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm"
                placeholder="برچسب (اختیاری)"
                value={newPrompt.label}
                onChange={(e) => setNewPrompt({ ...newPrompt, label: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm text-white"
              disabled={saving || !newPrompt.text.trim()}
              onClick={() => void addPrompt()}
            >
              <Plus className="h-4 w-4" />
              افزودن
            </button>
          </section>
          <section className="rounded-2xl border border-theme p-6">
            <h2 className="font-medium">پیشنهادهای فعلی</h2>
            <div className="mt-4 space-y-3">
              {prompts.map((p) => (
                <div key={p.id} className="rounded-xl border border-theme/60 p-4">
                  {editingPromptId === p.id ? (
                    <div className="grid gap-3">
                      <input
                        className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm"
                        value={editPromptForm.text}
                        onChange={(e) => setEditPromptForm({ ...editPromptForm, text: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <button type="button" className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm text-white" onClick={() => void saveEditPrompt()}>
                          ذخیره
                        </button>
                        <button type="button" className="rounded-lg border border-theme px-3 py-1.5 text-sm" onClick={() => setEditingPromptId(null)}>
                          انصراف
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between gap-3">
                      <p>{p.text}</p>
                      <div className="flex gap-2">
                        <button type="button" className="rounded-lg border border-theme px-3 py-1.5 text-sm" onClick={() => { setEditingPromptId(p.id); setEditPromptForm({ text: p.text, label: p.label ?? "", sort_order: p.sort_order, enabled: p.enabled }); }}>
                          ویرایش
                        </button>
                        <button type="button" className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-500" onClick={() => void removePrompt(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {tab === "tools" ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-theme p-6">
            <h2 className="font-medium">ابزار آماده جدید</h2>
            <p className="mt-1 text-xs text-muted">
              کاربر عکس آپلود می‌کند — AI با پرامپت شما آن را برای چاپ آماده می‌کند (مثلاً شاهنامه‌ای، حذف پس‌زمینه)
            </p>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm"
                placeholder="نام ابزار (مثلاً: شاهنامه‌ای)"
                value={newTool.name}
                onChange={(e) => setNewTool({ ...newTool, name: e.target.value })}
              />
              <input
                className="w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm"
                placeholder="توضیح کوتاه برای کاربر"
                value={newTool.description}
                onChange={(e) => setNewTool({ ...newTool, description: e.target.value })}
              />
              <textarea
                rows={4}
                className="w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm leading-relaxed"
                placeholder="پرامپت AI — مثلاً: این عکس را به سبک مینیاتور شاهنامه تبدیل کن. پس‌زمینه را حذف کن."
                value={newTool.prompt}
                onChange={(e) => setNewTool({ ...newTool, prompt: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm text-white"
              disabled={saving || !newTool.name.trim() || !newTool.prompt.trim()}
              onClick={() => void addTool()}
            >
              <Plus className="h-4 w-4" />
              افزودن ابزار
            </button>
          </section>

          <section className="rounded-2xl border border-theme p-6">
            <h2 className="font-medium">ابزارهای فعلی ({fmt(tools.length)})</h2>
            <div className="mt-4 space-y-4">
              {tools.map((tool) => (
                <div key={tool.id} className="rounded-xl border border-theme/60 p-4">
                  {editingToolId === tool.id ? (
                    <div className="space-y-3">
                      <input className="w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm" value={editToolForm.name} onChange={(e) => setEditToolForm({ ...editToolForm, name: e.target.value })} />
                      <input className="w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm" value={editToolForm.description} onChange={(e) => setEditToolForm({ ...editToolForm, description: e.target.value })} />
                      <textarea rows={4} className="w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm" value={editToolForm.prompt} onChange={(e) => setEditToolForm({ ...editToolForm, prompt: e.target.value })} />
                      <div className="flex gap-2">
                        <button type="button" className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm text-white" onClick={() => void saveEditTool()}>ذخیره</button>
                        <button type="button" className="rounded-lg border border-theme px-3 py-1.5 text-sm" onClick={() => setEditingToolId(null)}>انصراف</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{tool.name}</p>
                        {tool.description ? <p className="mt-1 text-sm text-muted">{tool.description}</p> : null}
                        <p className="mt-2 text-xs text-muted line-clamp-2">{tool.prompt}</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" className="rounded-lg border border-theme px-3 py-1.5 text-sm" onClick={() => { setEditingToolId(tool.id); setEditToolForm({ name: tool.name, description: tool.description ?? "", prompt: tool.prompt, sort_order: tool.sort_order, enabled: tool.enabled }); }}>
                          ویرایش
                        </button>
                        <button type="button" className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-500" onClick={() => void removeTool(tool.id)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {!tools.length ? <p className="text-sm text-muted">ابزاری ثبت نشده</p> : null}
            </div>
          </section>
        </div>
      ) : null}

      {tab === "config" && config ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-theme p-6">
            <h2 className="font-medium">پرامپت سیستم (پسوند)</h2>
            <p className="mt-1 text-xs text-muted">
              به انتهای همه درخواست‌ها اضافه می‌شود — کنترل کیفیت چاپ (بدون تیشرت، پس‌زمینه مجنتا)
            </p>
            <textarea
              rows={8}
              className="mt-4 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm leading-relaxed"
              value={config.system_prompt_suffix}
              onChange={(e) => setConfig({ ...config, system_prompt_suffix: e.target.value })}
            />
            <button
              type="button"
              className="mt-4 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm text-white"
              disabled={saving}
              onClick={() => void saveConfig()}
            >
              {saving ? "در حال ذخیره…" : "ذخیره"}
            </button>
          </section>
        </div>
      ) : null}

      {tab === "logs" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <input
              className="min-w-[12rem] flex-1 rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm"
              placeholder="جستجو در پرامپت…"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setLogsPage(1); void loadLogs(); } }}
            />
            <select className="rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2 text-sm" value={logStatus} onChange={(e) => { setLogStatus(e.target.value as "" | "success" | "failed"); setLogsPage(1); }}>
              <option value="">همه</option>
              <option value="success">موفق</option>
              <option value="failed">ناموفق</option>
            </select>
            <button type="button" className="rounded-xl border border-theme px-4 py-2 text-sm" onClick={() => { setLogsPage(1); void loadLogs(); }}>
              جستجو
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-theme">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b border-theme text-muted">
                  <th className="px-4 py-3 text-start font-normal">زمان</th>
                  <th className="px-4 py-3 text-start font-normal">پرامپت / ابزار</th>
                  <th className="px-4 py-3 text-start font-normal">کاربر</th>
                  <th className="px-4 py-3 text-start font-normal">وضعیت</th>
                  <th className="px-4 py-3 text-start font-normal">تصویر</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-theme/50 align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-muted">{fmtDate(log.created_at)}</td>
                    <td className="px-4 py-3">
                      {log.tool_name ? (
                        <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-xs">{log.tool_name}</span>
                      ) : null}
                      <p className="mt-1 max-w-md">{log.prompt_text}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{log.user_phone ?? (log.user_id ? `#${log.user_id}` : "مهمان")}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs", log.status === "success" ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600")}>
                        {log.status === "success" ? "موفق" : "ناموفق"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.storage_key ? (
                        <a href={mediaUrl(log.storage_key)} target="_blank" rel="noreferrer">
                          <img src={mediaUrl(log.storage_key)} alt="" className="h-12 w-12 rounded-lg border border-theme object-cover" />
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">{fmt(logsTotal)} مورد · صفحه {fmt(logsPage)}</span>
            <div className="flex gap-2">
              <button type="button" className="rounded-lg border border-theme px-3 py-1.5 disabled:opacity-40" disabled={logsPage <= 1} onClick={() => setLogsPage((p) => Math.max(1, p - 1))}>قبلی</button>
              <button type="button" className="rounded-lg border border-theme px-3 py-1.5 disabled:opacity-40" disabled={logsPage * 25 >= logsTotal} onClick={() => setLogsPage((p) => p + 1)}>بعدی</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

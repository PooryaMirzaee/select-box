"use client";

import { useEffect, useState } from "react";

import { ExternalLink, Loader2 } from "@/components/icons";
import {
  type ChatCannedResponse,
  type ChatConversation,
  type ChatPageVisit,
  adminFetchCanned,
  adminFetchPageVisits,
  adminPatchConversation,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from "@/lib/chat";
import { cn } from "@/lib/utils";

function formatVisitTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
}

function formatVisitDate(iso: string) {
  return new Date(iso).toLocaleDateString("fa-IR", { month: "short", day: "numeric" });
}

type Props = {
  token: string;
  conversation: ChatConversation;
  onUpdate: (conv: ChatConversation) => void;
  onQuickReply: (text: string) => void;
  onExport: () => void;
  liveVisits: ChatPageVisit[];
};

export function AdminChatSidebar({
  token,
  conversation,
  onUpdate,
  onQuickReply,
  onExport,
  liveVisits,
}: Props) {
  const [visits, setVisits] = useState<ChatPageVisit[]>([]);
  const [canned, setCanned] = useState<ChatCannedResponse[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [notes, setNotes] = useState(conversation.admin_notes ?? "");
  const [tagInput, setTagInput] = useState("");
  const [visitorName, setVisitorName] = useState(conversation.visitor_name ?? "");
  const [visitorPhone, setVisitorPhone] = useState(conversation.visitor_phone ?? "");

  useEffect(() => {
    setNotes(conversation.admin_notes ?? "");
    setVisitorName(conversation.visitor_name ?? "");
    setVisitorPhone(conversation.visitor_phone ?? "");
  }, [conversation.id, conversation.admin_notes, conversation.visitor_name, conversation.visitor_phone]);

  useEffect(() => {
    setLoadingVisits(true);
    adminFetchPageVisits(token, conversation.id)
      .then((r) => setVisits(r.items))
      .finally(() => setLoadingVisits(false));
    adminFetchCanned(token).then(setCanned).catch(() => {});
  }, [token, conversation.id]);

  const allVisits = mergeVisits(visits, liveVisits);

  async function saveField(payload: Parameters<typeof adminPatchConversation>[2]) {
    const updated = await adminPatchConversation(token, conversation.id, payload);
    onUpdate(updated);
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-theme bg-[var(--bg-elevated)] text-sm">
      {/* اطلاعات بازدیدکننده */}
      <section className="border-b border-theme p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">بازدیدکننده</h3>
        <div className="space-y-2">
          <input
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            onBlur={() => saveField({ visitor_name: visitorName })}
            placeholder="نام"
            className="w-full rounded-lg border border-theme bg-[var(--input-bg)] px-2 py-1.5 text-xs"
          />
          <input
            value={visitorPhone}
            onChange={(e) => setVisitorPhone(e.target.value)}
            onBlur={() => saveField({ visitor_phone: visitorPhone })}
            placeholder="شماره تماس"
            dir="ltr"
            className="w-full rounded-lg border border-theme bg-[var(--input-bg)] px-2 py-1.5 text-xs"
          />
        </div>
        <dl className="mt-3 space-y-1 text-xs text-muted">
          {conversation.browser && (
            <div className="flex justify-between">
              <dt>مرورگر</dt>
              <dd>{conversation.browser}</dd>
            </div>
          )}
          {conversation.os_name && (
            <div className="flex justify-between">
              <dt>سیستم‌عامل</dt>
              <dd>{conversation.os_name}</dd>
            </div>
          )}
          {conversation.device_type && (
            <div className="flex justify-between">
              <dt>دستگاه</dt>
              <dd>{conversation.device_type === "mobile" ? "موبایل" : conversation.device_type === "tablet" ? "تبلت" : "دسکتاپ"}</dd>
            </div>
          )}
          {conversation.referrer_url && (
            <div>
              <dt className="mb-0.5">منبع ورود</dt>
              <dd className="truncate text-[10px]" dir="ltr">{conversation.referrer_url}</dd>
            </div>
          )}
          {conversation.customer_user_id && (
            <div className="flex justify-between">
              <dt>حساب کاربری</dt>
              <dd className="text-[var(--accent)]">#{conversation.customer_user_id}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* اولویت و برچسب */}
      <section className="border-b border-theme p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">اولویت</h3>
        <select
          value={conversation.priority}
          onChange={(e) => saveField({ priority: e.target.value })}
          className="w-full rounded-lg border border-theme bg-[var(--input-bg)] px-2 py-1.5 text-xs"
        >
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <p className={cn("mt-1 text-[10px]", PRIORITY_COLORS[conversation.priority])}>
          {PRIORITY_LABELS[conversation.priority]}
        </p>

        <h3 className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-muted">برچسب‌ها</h3>
        <div className="flex flex-wrap gap-1">
          {(conversation.tags ?? []).map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px]"
            >
              {tag}
              <button
                type="button"
                onClick={() =>
                  saveField({ tags: (conversation.tags ?? []).filter((t) => t !== tag) })
                }
                className="opacity-60 hover:opacity-100"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mt-1 flex gap-1">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && tagInput.trim()) {
                saveField({ tags: [...(conversation.tags ?? []), tagInput.trim()] });
                setTagInput("");
              }
            }}
            placeholder="برچسب جدید"
            className="flex-1 rounded-lg border border-theme bg-[var(--input-bg)] px-2 py-1 text-[10px]"
          />
        </div>
      </section>

      {/* یادداشت داخلی */}
      <section className="border-b border-theme p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">یادداشت تیم</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => saveField({ admin_notes: notes })}
          rows={3}
          placeholder="یادداشت فقط برای تیم…"
          className="w-full resize-none rounded-lg border border-theme bg-[var(--input-bg)] px-2 py-1.5 text-xs"
        />
      </section>

      {/* تاریخچه صفحات */}
      <section className="border-b border-theme p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            صفحات بازدید شده ({allVisits.length})
          </h3>
          <button type="button" onClick={onExport} className="text-[10px] text-[var(--accent)] hover:underline">
            خروجی
          </button>
        </div>
        {conversation.current_page_url && (
          <div className="mb-2 rounded-lg border border-green-500/30 bg-green-500/10 px-2 py-1.5">
            <p className="text-[10px] text-green-700 dark:text-green-400">صفحه فعلی</p>
            <a
              href={conversation.current_page_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{conversation.current_page_title || conversation.current_page_url}</span>
            </a>
          </div>
        )}
        {loadingVisits ? (
          <Loader2 className="mx-auto" size={16} />
        ) : allVisits.length === 0 ? (
          <p className="text-xs text-muted">هنوز صفحه‌ای ثبت نشده</p>
        ) : (
          <ol className="max-h-48 space-y-1 overflow-y-auto">
            {[...allVisits].reverse().map((v) => (
              <li
                key={v.id}
                className="flex items-start gap-2 rounded-lg px-1 py-1 hover:bg-[var(--sidebar-hover)]"
              >
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                <div className="min-w-0 flex-1">
                  <a
                    href={v.page_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-xs hover:text-[var(--accent)]"
                  >
                    {v.page_title || v.page_url}
                  </a>
                  <p className="text-[10px] text-muted">
                    {formatVisitDate(v.visited_at)} · {formatVisitTime(v.visited_at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* پاسخ‌های آماده */}
      <section className="p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">پاسخ آماده</h3>
        <div className="space-y-1">
          {canned.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onQuickReply(c.body)}
              className="w-full rounded-lg border border-theme px-2 py-1.5 text-right text-xs hover:bg-[var(--sidebar-hover)]"
            >
              <span className="font-medium">{c.title}</span>
              <p className="truncate text-[10px] text-muted">{c.body}</p>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

function mergeVisits(stored: ChatPageVisit[], live: ChatPageVisit[]): ChatPageVisit[] {
  const map = new Map<number, ChatPageVisit>();
  for (const v of stored) map.set(v.id, v);
  for (const v of live) map.set(v.id, v);
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.visited_at).getTime() - new Date(b.visited_at).getTime(),
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BookOpen, Search } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import {
  HELP_GROUPS,
  HELP_SECTIONS,
  searchHelpSections,
  type HelpBlock,
  type HelpCalloutKind,
  type HelpSection,
} from "@/lib/admin-help";
import { cn } from "@/lib/utils";

const CALLOUT_STYLE: Record<HelpCalloutKind, string> = {
  tip: "border-emerald-500/30 bg-emerald-500/8",
  warn: "border-amber-500/35 bg-amber-500/10",
  danger: "border-red-500/35 bg-red-500/10",
  info: "border-[var(--accent)]/35 bg-[var(--accent-soft)]",
};

const CALLOUT_LABEL: Record<HelpCalloutKind, string> = {
  tip: "نکته",
  warn: "هشدار",
  danger: "مهم",
  info: "یادداشت",
};

function HelpBlocks({ blocks }: { blocks: HelpBlock[] }) {
  return (
    <div className="mt-4 space-y-4 text-sm leading-7">
      {blocks.map((b, i) => {
        if (b.type === "p") {
          return (
            <p key={i} className="text-[var(--fg)]/90">
              {b.text}
            </p>
          );
        }
        if (b.type === "steps") {
          return (
            <ol key={i} className="space-y-2.5">
              {b.items.map((item, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-[var(--accent-fg)]">
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          );
        }
        if (b.type === "ul") {
          return (
            <ul key={i} className="list-disc space-y-1.5 pr-5">
              {b.items.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          );
        }
        if (b.type === "table") {
          return (
            <div key={i} className="overflow-x-auto rounded-xl border border-theme">
              <table className="w-full min-w-[480px] text-right text-sm">
                <thead className="bg-[var(--bg-muted)]/50 text-muted">
                  <tr>
                    {b.headers.map((h) => (
                      <th key={h} className="p-3 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((row, ri) => (
                    <tr key={ri} className="border-t border-theme/70">
                      {row.map((cell, ci) => (
                        <td key={ci} className="p-3 align-top">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (b.type === "callout") {
          return (
            <div key={i} className={cn("rounded-xl border px-4 py-3", CALLOUT_STYLE[b.kind])}>
              <p className="text-xs font-semibold">
                {CALLOUT_LABEL[b.kind]} — {b.title}
              </p>
              <p className="mt-1 text-sm leading-6">{b.text}</p>
            </div>
          );
        }
        return (
          <div key={i} className="flex flex-wrap gap-2">
            {b.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-theme px-3 py-1.5 text-xs transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function SectionCard({ section }: { section: HelpSection }) {
  return (
    <article id={section.id} className="card-theme scroll-mt-24 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted">{section.group}</p>
          <h2 className="mt-1 text-xl font-semibold">{section.title}</h2>
          <p className="mt-1 text-sm text-muted">{section.summary}</p>
        </div>
        {section.href ? (
          <Link href={section.href}>
            <Button variant="outline" size="sm">
              رفتن به بخش
            </Button>
          </Link>
        ) : null}
      </div>
      <HelpBlocks blocks={section.blocks} />
    </article>
  );
}

export default function AdminHelpPage() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(HELP_SECTIONS[0]?.id ?? "");

  const results = useMemo(() => searchHelpSections(query), [query]);

  const grouped = useMemo(() => {
    return HELP_GROUPS.map((group) => ({
      group,
      sections: results.filter((s) => s.group === group),
    })).filter((g) => g.sections.length);
  }, [results]);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && HELP_SECTIONS.some((s) => s.id === hash)) {
      setActiveId(hash);
      document.getElementById(hash)?.scrollIntoView({ block: "start" });
    }
  }, []);

  useEffect(() => {
    const nodes = results
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el);
    if (!nodes.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveId(visible.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.25, 0.5] },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [results]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm text-[var(--accent)]">
            <BookOpen className="h-4 w-4" />
            آموزش مسئول سایت
          </p>
          <h1 className="mt-2 text-3xl font-semibold">راهنمای کامل پنل ادمین</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            این صفحه مرجع عملیاتی فروشگاه است: از روتین روزانه و سفارش تا کاتالوگ، صفحه اصلی،
            پرداخت، پیامک و عیب‌یابی. برای کار حرفه‌ای، اول روتین روزانه و چرخه سفارش را مسلط شوید.
          </p>
        </div>
        <Button variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
          چاپ / PDF
        </Button>
      </div>

      <div className="mt-6 print:hidden">
        <label className="relative block max-w-xl">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="input-theme min-h-[44px] pr-10"
            placeholder="جستجو در آموزش: سفارش، موجودی، زرین‌پال، پیامک…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <p className="mt-2 text-xs text-muted">
          {results.length} از {HELP_SECTIONS.length} بخش
          {query.trim() ? " مطابق جستجو" : ""}
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="print:hidden lg:sticky lg:top-6 lg:self-start">
          <p className="mb-3 text-xs font-medium text-muted">فهرست</p>
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pe-2 text-sm">
            {grouped.map(({ group, sections }) => (
              <div key={group}>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                  {group}
                </p>
                <ul className="space-y-0.5">
                  {sections.map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        onClick={() => setActiveId(s.id)}
                        className={cn(
                          "block rounded-lg px-2 py-1.5 transition",
                          activeId === s.id
                            ? "bg-[var(--sidebar-active)] font-medium text-[var(--sidebar-active-fg)]"
                            : "text-muted hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]",
                        )}
                      >
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="space-y-6">
          {!results.length ? (
            <div className="card-theme p-8 text-center text-sm text-muted">
              موردی برای «{query}» پیدا نشد. عبارت کوتاه‌تری امتحان کنید.
            </div>
          ) : null}
          {grouped.map(({ group, sections }) => (
            <div key={group} className="space-y-6">
              {sections.map((section) => (
                <SectionCard key={section.id} section={section} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

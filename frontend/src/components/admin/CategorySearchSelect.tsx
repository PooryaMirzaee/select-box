"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ChevronDown, Search, X } from "@/components/icons";
import { cn } from "@/lib/utils";

export type CategoryOption = {
  id: number;
  label: string;
  name_fa?: string;
  slug?: string;
};

type Props = {
  value: number | null;
  label?: string | null;
  options: CategoryOption[];
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  onChange: (id: number) => void;
};

export function CategorySearchSelect({
  value,
  label,
  options,
  disabled,
  className,
  placeholder = "انتخاب دسته...",
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel =
    label ||
    options.find((o) => o.id === value)?.label ||
    (value != null ? `#${value}` : placeholder);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => {
      const hay = `${o.label} ${o.name_fa || ""} ${o.slug || ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [options, q]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  function pick(id: number) {
    onChange(id);
    setOpen(false);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = filtered[active];
      if (row) pick(row.id);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative min-w-[10rem]", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "input-theme flex min-h-11 w-full items-center gap-1 px-3 py-2 text-start text-sm md:min-h-0 md:px-2 md:py-1.5 md:text-xs",
          open && "border-[var(--accent)]/50",
        )}
        title={selectedLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="min-w-0 flex-1 truncate">{selectedLabel}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted transition", open && "rotate-180")} />
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/35 md:hidden"
            aria-label="بستن"
            onClick={() => setOpen(false)}
          />
          <div className="absolute start-0 z-40 mt-1 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-theme bg-card shadow-lg max-md:fixed max-md:inset-x-3 max-md:bottom-3 max-md:top-auto max-md:mt-0 max-md:w-auto max-md:max-h-[70vh]">
          <div className="flex items-center gap-2 border-b border-theme px-3 py-2.5 md:px-2 md:py-1.5">
            <Search className="h-4 w-4 shrink-0 text-muted md:h-3.5 md:w-3.5" />
            <input
              ref={inputRef}
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted md:text-sm"
              placeholder="جستجوی دسته..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onInputKey}
            />
            {q ? (
              <button type="button" className="rounded p-1 text-muted hover:text-[var(--fg)]" onClick={() => setQ("")}>
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <ul className="max-h-[50vh] overflow-y-auto py-1 md:max-h-64" role="listbox">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-muted">دسته‌ای پیدا نشد</li>
            ) : (
              filtered.map((o, idx) => {
                const selected = o.id === value;
                const isActive = idx === active;
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-2 px-3 py-2.5 text-start text-sm transition md:min-h-0 md:py-2",
                        selected && "bg-[var(--accent-soft)] font-medium",
                        isActive && !selected && "bg-[var(--bg-elevated)]",
                        !selected && !isActive && "hover:bg-[var(--bg-elevated)]",
                      )}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => pick(o.id)}
                    >
                      <span className="min-w-0 flex-1 truncate">{o.label}</span>
                      {selected ? <span className="text-[10px] text-[var(--accent)]">فعلی</span> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          <p className="border-t border-theme px-3 py-2 text-[11px] text-muted md:py-1.5 md:text-[10px]">
            {filtered.length.toLocaleString("fa-IR")} از {options.length.toLocaleString("fa-IR")} دسته
          </p>
        </div>
        </>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { ArrowLeft, ChevronDown, Grid3X3 } from "@/components/icons";
import type { CategoryNavNode } from "@/lib/category-nav";
import { cn } from "@/lib/utils";

type Props = {
  categories: CategoryNavNode[];
  onNavigate?: () => void;
};

export function CategoryThumb({
  category,
  size = "md",
}: {
  category: Pick<CategoryNavNode, "name_fa" | "image_url">;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const text = size === "sm" ? "text-sm" : size === "lg" ? "text-lg" : "text-base";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl border border-theme bg-[var(--bg-elevated)]",
        dims,
      )}
    >
      {category.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={category.image_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center bg-[var(--accent-soft)] font-display text-[var(--accent)]",
            text,
          )}
        >
          {category.name_fa.charAt(0)}
        </div>
      )}
    </div>
  );
}

function DesktopPanel({
  categories,
  open,
  onClose,
}: {
  categories: CategoryNavNode[];
  open: boolean;
  onClose: () => void;
}) {
  const [top, setTop] = useState(64);
  const [activeId, setActiveId] = useState(categories[0]?.id ?? 0);
  const active = categories.find((c) => c.id === activeId) ?? categories[0];

  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const h = document.querySelector("header")?.getBoundingClientRect().height;
      if (h) setTop(h);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  useEffect(() => {
    if (open && categories[0]) setActiveId(categories[0].id);
  }, [open, categories]);

  if (!categories.length) return null;

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-x-0 bottom-0 z-[38] bg-black/35 backdrop-blur-[1px]"
            style={{ top }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 z-[39] border-b border-theme bg-[var(--card)] shadow-[var(--shadow-soft)]"
            style={{ top }}
            role="dialog"
            aria-label="دسته‌بندی محصولات"
          >
            <div className="mx-auto grid max-w-6xl md:grid-cols-[220px_1fr]">
              {/* ریشه دسته‌ها */}
              <aside className="border-b border-theme bg-[var(--bg-elevated)] md:border-b-0 md:border-e">
                <ul className="no-scrollbar flex max-h-[40vh] flex-row gap-1 overflow-x-auto p-3 md:max-h-[min(70vh,520px)] md:flex-col md:overflow-y-auto">
                  {categories.map((root) => {
                    const selected = root.id === active?.id;
                    return (
                      <li key={root.id} className="shrink-0 md:w-full">
                        <button
                          type="button"
                          onClick={() => setActiveId(root.id)}
                          onMouseEnter={() => setActiveId(root.id)}
                          className={cn(
                            "flex w-full min-h-[44px] items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition",
                            selected
                              ? "bg-[var(--card)] font-semibold text-[var(--fg)] shadow-sm ring-1 ring-[var(--accent)]/30"
                              : "text-muted hover:bg-[var(--card)]/70 hover:text-[var(--fg)]",
                          )}
                        >
                          <CategoryThumb category={root} size="sm" />
                          <span className="truncate">{root.name_fa}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </aside>

              {/* زیردسته‌ها */}
              <div className="max-h-[min(70vh,520px)] overflow-y-auto p-4 sm:p-6">
                {active ? (
                  <>
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <CategoryThumb category={active} size="lg" />
                        <div>
                          <h3 className="font-display text-lg">{active.name_fa}</h3>
                          {active.child_count > 0 ? (
                            <p className="text-xs text-muted">{active.child_count} زیردسته</p>
                          ) : null}
                        </div>
                      </div>
                      <Link
                        href={`/browse/${active.path}`}
                        onClick={onClose}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-theme px-4 text-sm font-medium transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      >
                        مشاهده همه
                        <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                      </Link>
                    </div>

                    {active.children.length > 0 ? (
                      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {active.children.map((child) => (
                          <li key={child.id}>
                            <Link
                              href={`/browse/${child.path}`}
                              onClick={onClose}
                              className="flex min-h-[52px] items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition hover:border-theme hover:bg-[var(--bg-elevated)]"
                            >
                              <CategoryThumb category={child} size="sm" />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">{child.name_fa}</span>
                                {child.children.length > 0 ? (
                                  <span className="text-[11px] text-muted">
                                    {child.children.length} مورد
                                  </span>
                                ) : null}
                              </span>
                            </Link>
                            {child.children.length > 0 ? (
                              <ul className="mb-1 me-2 mt-0.5 space-y-0.5 border-s border-theme/60 ps-4">
                                {child.children.slice(0, 6).map((grand) => (
                                  <li key={grand.id}>
                                    <Link
                                      href={`/browse/${grand.path}`}
                                      onClick={onClose}
                                      className="block rounded-md px-2 py-1.5 text-xs text-muted transition hover:text-[var(--accent)]"
                                    >
                                      {grand.name_fa}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-xl border border-dashed border-theme bg-[var(--bg-elevated)] px-4 py-8 text-center text-sm text-muted">
                        زیردسته‌ای نیست — مستقیم وارد این دسته شوید.
                      </p>
                    )}
                  </>
                ) : null}

                <div className="mt-6 border-t border-theme pt-4">
                  <Link
                    href="/browse"
                    onClick={onClose}
                    className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] transition hover:opacity-80"
                  >
                    <Grid3X3 className="h-4 w-4" />
                    همه دسته‌بندی‌ها
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function MobileAccordionNode({
  node,
  depth,
  onNavigate,
}: {
  node: CategoryNavNode;
  depth: number;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasKids = node.children.length > 0;
  const pad = depth > 0 ? "me-2" : "";

  if (!hasKids) {
    return (
      <Link
        href={`/browse/${node.path}`}
        onClick={onNavigate}
        className={cn(
          "flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-[var(--bg-elevated)]",
          pad,
        )}
      >
        <CategoryThumb category={node} size="sm" />
        <span>{node.name_fa}</span>
      </Link>
    );
  }

  return (
    <div className={pad}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm transition hover:bg-[var(--bg-elevated)]"
        aria-expanded={open}
      >
        <span className="flex items-center gap-3">
          <CategoryThumb category={node} size="sm" />
          {node.name_fa}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 border-s border-theme/50 py-1 ps-3">
              <Link
                href={`/browse/${node.path}`}
                onClick={onNavigate}
                className="block min-h-[40px] rounded-lg px-3 py-2 text-xs font-medium text-[var(--accent)]"
              >
                همهٔ {node.name_fa}
              </Link>
              {node.children.map((child) => (
                <MobileAccordionNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function CategoryMegaMenuDesktop({ categories }: Pick<Props, "categories">) {
  const [open, setOpen] = useState(false);
  const btnId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointer = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        const panel = document.querySelector('[role="dialog"][aria-label="دسته‌بندی محصولات"]');
        if (panel && panel.contains(e.target as Node)) return;
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open, close]);

  if (!categories.length) {
    return (
      <Link href="/browse" className="transition hover:text-[var(--fg)]">
        دسته‌بندی
      </Link>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        id={btnId}
        type="button"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 transition",
          open
            ? "border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--fg)]"
            : "hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]",
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
      >
        <Grid3X3 className="h-3.5 w-3.5 text-[var(--accent)]" />
        دسته‌بندی
        <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
      </button>
      <DesktopPanel categories={categories} open={open} onClose={close} />
    </div>
  );
}

export function CategoryMegaMenuMobile({ categories, onNavigate }: Props) {
  const [expanded, setExpanded] = useState(true);

  if (!categories.length) {
    return (
      <Link
        href="/browse"
        className="min-h-[44px] rounded-lg px-3 py-3 text-sm"
        onClick={onNavigate}
      >
        دسته‌بندی
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex min-h-[44px] w-full items-center justify-between rounded-lg px-3 py-3 text-sm font-medium"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-[var(--accent)]" />
          دسته‌بندی‌ها
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted transition", expanded && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="space-y-1 pb-2 ps-1">
              {categories.map((root) => (
                <MobileAccordionNode key={root.id} node={root} depth={0} onNavigate={onNavigate} />
              ))}
              <Link
                href="/browse"
                onClick={onNavigate}
                className="mt-2 flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--accent)]"
              >
                <Grid3X3 className="h-4 w-4" />
                همه دسته‌بندی‌ها
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { ArrowLeft, ChevronDown, Grid3X3 } from "@/components/icons";
import type { CategoryNavNode } from "@/lib/category-nav";
import { cn } from "@/lib/utils";

type Props = {
  categories: CategoryNavNode[];
  /** بستن منوی موبایل هدر پس از ناوبری */
  onNavigate?: () => void;
};

function CategoryThumb({
  category,
  size = "md",
}: {
  category: Pick<CategoryNavNode, "name_fa" | "image_url">;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const text = size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-base";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl border border-theme/50 bg-[var(--bg)]",
        dims,
      )}
    >
      {category.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={category.image_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--accent)]/25 to-[var(--bg-elevated)] font-semibold text-[var(--accent)]",
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
  const [top, setTop] = useState(57);

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

  if (!categories.length) return null;

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 bottom-0 z-[38] bg-black/20 backdrop-blur-[2px] dark:bg-black/40"
            style={{ top }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 z-[39] border-b border-theme bg-header shadow-[var(--shadow-soft)] backdrop-blur-xl"
            style={{ top }}
            role="region"
            aria-label="دسته‌بندی محصولات"
          >
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
              <div
                className={cn(
                  "grid gap-6",
                  categories.length === 1 && "max-w-sm",
                  categories.length === 2 && "sm:grid-cols-2",
                  categories.length >= 3 && "sm:grid-cols-2 lg:grid-cols-3",
                  categories.length >= 4 && "xl:grid-cols-4",
                )}
              >
                {categories.map((root, i) => (
                  <motion.div
                    key={root.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.25 }}
                    className="rounded-2xl border border-theme/60 bg-card/80 p-4"
                  >
                    <Link
                      href={`/browse/${root.path}`}
                      onClick={onClose}
                      className="group flex items-center gap-3 rounded-xl p-1 transition hover:bg-[var(--accent-soft)]"
                    >
                      <CategoryThumb category={root} size="lg" />
                      <div className="min-w-0">
                        <p className="font-semibold leading-snug transition group-hover:text-[var(--accent)]">
                          {root.name_fa}
                        </p>
                        {root.child_count > 0 ? (
                          <p className="mt-0.5 text-xs text-muted">{root.child_count} زیردسته</p>
                        ) : null}
                      </div>
                    </Link>

                    {root.children.length > 0 ? (
                      <ul className="mt-3 space-y-0.5 border-s-2 border-[var(--accent)]/20 ps-3">
                        {root.children.map((child) => (
                          <li key={child.id}>
                            <Link
                              href={`/browse/${child.path}`}
                              onClick={onClose}
                              className="flex min-h-[36px] items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted transition hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]"
                            >
                              <CategoryThumb category={child} size="sm" />
                              <span className="min-w-0 truncate">{child.name_fa}</span>
                            </Link>
                            {child.children.length > 0 ? (
                              <ul className="me-2 mt-0.5 space-y-0.5 border-s border-theme/40 ps-3">
                                {child.children.map((grand) => (
                                  <li key={grand.id}>
                                    <Link
                                      href={`/browse/${grand.path}`}
                                      onClick={onClose}
                                      className="block rounded-md px-2 py-1 text-xs text-muted transition hover:text-[var(--accent)]"
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
                    ) : null}

                    <Link
                      href={`/browse/${root.path}`}
                      onClick={onClose}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] transition hover:gap-2"
                    >
                      مشاهده همه
                      <ArrowLeft className="h-3 w-3 rotate-180" />
                    </Link>
                  </motion.div>
                ))}
              </div>

              <div className="mt-5 border-t border-theme pt-4">
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }, [clearCloseTimer]);

  const handleOpen = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!categories.length) {
    return (
      <Link href="/browse" className="transition hover:text-[var(--fg)]">
        دسته‌بندی
      </Link>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={handleOpen}
      onMouseLeave={scheduleClose}
      onFocus={handleOpen}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node)) scheduleClose();
      }}
    >
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 transition hover:text-[var(--fg)]",
          open && "text-[var(--fg)]",
        )}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        دسته‌بندی
        <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
      </button>
      <DesktopPanel categories={categories} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

export function CategoryMegaMenuMobile({ categories, onNavigate }: Props) {
  const [expanded, setExpanded] = useState(false);

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
        className="flex min-h-[44px] w-full items-center justify-between rounded-lg px-3 py-3 text-sm"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-[var(--accent)]" />
          دسته‌بندی
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

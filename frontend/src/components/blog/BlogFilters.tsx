"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop;
      const height = el.scrollHeight - el.clientHeight;
      setProgress(height > 0 ? Math.min(100, (scrollTop / height) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent"
      aria-hidden
    >
      <div
        className="h-full bg-[var(--accent)] transition-[width] duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

type FilterProps = {
  categories: { slug: string; name_fa: string; post_count?: number }[];
  activeCategory?: string;
  activeTag?: string;
  basePath?: string;
};

export function BlogCategoryChips({ categories, activeCategory, activeTag, basePath = "/blog" }: FilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={basePath}
        className={cn("chip-theme", !activeCategory && !activeTag && "is-active")}
      >
        همه
      </Link>
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`${basePath}/category/${c.slug}`}
          className={cn("chip-theme", activeCategory === c.slug && "is-active")}
        >
          {c.name_fa}
          {c.post_count != null && c.post_count > 0 ? (
            <span className="ms-1 opacity-60">({c.post_count})</span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Search } from "@/components/icons";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
};

function SearchBarInner({ className, placeholder = "جستجوی محصول…", autoFocus }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/catalog?q=${encodeURIComponent(q)}` : "/catalog");
  }

  return (
    <form role="search" onSubmit={submit} className={cn("relative", className)}>
      <input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="جستجوی محصول"
        autoFocus={autoFocus}
        className="min-h-[44px] w-full rounded-full border border-theme bg-[var(--input-bg)] pe-4 ps-11 text-sm text-[var(--fg)] outline-none transition placeholder:text-muted focus:border-[color-mix(in_srgb,var(--accent)_55%,var(--border))] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
      />
      <button
        type="submit"
        aria-label="جستجو"
        className="absolute inset-y-0 start-0 flex w-11 items-center justify-center text-muted transition hover:text-[var(--accent)]"
      >
        <Search className="h-5 w-5" />
      </button>
    </form>
  );
}

export function SearchBar(props: Props) {
  return (
    <Suspense fallback={<div className={cn("skeleton min-h-[44px] rounded-full", props.className)} />}>
      <SearchBarInner {...props} />
    </Suspense>
  );
}

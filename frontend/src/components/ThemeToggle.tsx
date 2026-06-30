"use client";

import { Moon, Sun } from "@/components/icons";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <span className={cn("inline-block h-10 w-10", className)} aria-hidden />;
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "تم روشن" : "تم تیره"}
      className={cn(
        "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-theme text-muted transition hover:text-[var(--fg)]",
        className,
      )}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid3X3, Home, ShoppingBag, User } from "@/components/icons";

import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "خانه", icon: Home },
  { href: "/browse", label: "دسته‌ها", icon: Grid3X3 },
  { href: "/cart", label: "سبد", icon: ShoppingBag },
  { href: "/account", label: "حساب", icon: User },
];

export function MobileNav() {
  const path = usePathname();
  if (path.startsWith("/admin")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-theme bg-header pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-lg justify-around px-2 py-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-[52px] min-w-[64px] flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] transition",
                active ? "text-[var(--accent)]" : "text-muted",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

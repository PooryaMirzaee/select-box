"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid3X3, Home, ShoppingBag, User } from "@/components/icons";

import { useCart } from "@/components/shop/CartProvider";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "خانه", icon: Home },
  { href: "/browse", label: "دسته‌ها", icon: Grid3X3 },
  { href: "/cart", label: "سبد خرید", icon: ShoppingBag },
  { href: "/account", label: "حساب", icon: User },
];

export function MobileNav() {
  const path = usePathname();
  const { itemCount } = useCart();
  // صفحه محصول نوار خرید چسبان خودش را دارد
  if (path.startsWith("/admin") || path.startsWith("/product/")) return null;

  return (
    <nav
      aria-label="ناوبری اصلی"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-theme bg-header pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-lg justify-around px-2 py-1.5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-[56px] min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors duration-150",
                active ? "text-[var(--accent)]" : "text-muted",
              )}
            >
              <span
                className={cn(
                  "relative flex h-7 items-center justify-center rounded-full px-4 transition-colors duration-200",
                  active && "bg-[var(--accent-soft)]",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
                {href === "/cart" && itemCount > 0 ? (
                  <span className="absolute -end-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-bold leading-none text-[var(--accent-fg)]">
                    {itemCount > 99 ? "۹۹+" : itemCount.toLocaleString("fa-IR")}
                  </span>
                ) : null}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

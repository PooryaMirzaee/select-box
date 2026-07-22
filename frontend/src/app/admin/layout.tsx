"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FolderTree,
  LayoutDashboard,
  ImagePlus,
  Menu,
  Package,
  MessageCircle,
  BarChart3,
  Newspaper,
  Settings,
  ShoppingCart,
  Tag,
  LogOut,
  ExternalLink,
  User,
} from "@/components/icons";

import { ThemeToggle } from "@/components/ThemeToggle";
import { SelectBoxLogo } from "@/components/brand/SelectBoxLogo";
import { setAdminToken, setAuthToken } from "@/lib/cart-session";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "داشبورد", icon: LayoutDashboard },
  { href: "/admin/categories", label: "دسته‌ها", icon: FolderTree },
  { href: "/admin/header", label: "هدر", icon: Menu },
  { href: "/admin/homepage", label: "صفحه اصلی", icon: ImagePlus },
  { href: "/admin/products", label: "محصولات", icon: Package },
  { href: "/admin/enrichment", label: "غنی‌سازی", icon: ImagePlus },
  { href: "/admin/business", label: "سفارش عمده", icon: ShoppingCart },
  { href: "/admin/coupons", label: "کوپن‌ها", icon: Tag },
  { href: "/admin/orders", label: "سفارش‌ها", icon: ShoppingCart },
  { href: "/admin/chat", label: "چت پشتیبانی", icon: MessageCircle },
  { href: "/admin/analytics", label: "آمار و آنالیتیکس", icon: BarChart3 },
  { href: "/admin/users", label: "کاربران", icon: User },
  { href: "/admin/blog", label: "وبلاگ", icon: Newspaper },
  { href: "/admin/settings", label: "تنظیمات", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (path === "/admin/login") {
      setReady(true);
      return;
    }
    const token = localStorage.getItem(STORAGE_KEYS.adminToken);
    if (!token) router.replace("/admin/login");
    else setReady(true);
  }, [path, router]);

  if (path === "/admin/login") return <>{children}</>;
  if (!ready) return null;

  return (
    <div className="flex min-h-screen">
      <aside
        className="flex w-56 shrink-0 flex-col border-l border-theme p-6"
        style={{ background: "var(--sidebar-bg)" }}
      >
        <SelectBoxLogo href="/" size="sm" />
        <p className="mt-1 text-xs text-muted">ادمین SelectBox</p>
        <nav className="mt-10 flex-1 space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "admin-nav-link",
                (path === href || (href !== "/admin" && path.startsWith(href))) && "is-active",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 space-y-3 border-t border-theme pt-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted">تم</span>
            <ThemeToggle />
          </div>
          <Link
            href="/"
            className="admin-nav-link text-xs"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            مشاهده فروشگاه
          </Link>
          <button
            type="button"
            className="admin-nav-link w-full text-xs hover:!text-red-500"
            onClick={() => {
              setAdminToken(null);
              setAuthToken(null);
              router.push("/admin/login");
            }}
          >
            <LogOut className="h-3.5 w-3.5" />
            خروج
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 sm:p-8">{children}</main>
    </div>
  );
}

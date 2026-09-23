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
  BookOpen,
  X,
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
  { href: "/admin/help", label: "آموزش مسئول سایت", icon: BookOpen },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (path === "/admin/login") {
      setReady(true);
      return;
    }
    const token = localStorage.getItem(STORAGE_KEYS.adminToken);
    if (!token) router.replace("/admin/login");
    else setReady(true);
  }, [path, router]);

  useEffect(() => {
    setNavOpen(false);
  }, [path]);

  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  if (path === "/admin/login") return <>{children}</>;
  if (!ready) return null;

  const pageTitle =
    links.find(
      (l) => path === l.href || (l.href !== "/admin" && path.startsWith(l.href)),
    )?.label ?? "ادمین";

  function NavBody({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <>
        <SelectBoxLogo href="/" size="sm" />
        <p className="mt-1 text-xs text-muted">ادمین فروشگاه دشتستان</p>
        <nav className="mt-8 flex-1 space-y-1 overflow-y-auto">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
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
            onClick={onNavigate}
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
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* موبایل: نوار بالا */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-theme bg-[var(--bg)]/95 px-3 py-2.5 backdrop-blur md:hidden print:hidden">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-theme"
          aria-label="منو"
          onClick={() => setNavOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{pageTitle}</p>
        </div>
        <ThemeToggle />
      </header>

      {/* موبایل: دراور */}
      {navOpen ? (
        <div className="fixed inset-0 z-40 md:hidden print:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="بستن منو"
            onClick={() => setNavOpen(false)}
          />
          <aside
            className="absolute inset-y-0 end-0 flex w-[min(18rem,88vw)] flex-col border-s border-theme p-5 shadow-xl"
            style={{ background: "var(--sidebar-bg)" }}
          >
            <button
              type="button"
              className="mb-3 ms-auto flex h-10 w-10 items-center justify-center rounded-xl border border-theme"
              aria-label="بستن"
              onClick={() => setNavOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <NavBody onNavigate={() => setNavOpen(false)} />
          </aside>
        </div>
      ) : null}

      {/* دسکتاپ: سایدبار ثابت */}
      <aside
        className="hidden w-56 shrink-0 flex-col border-l border-theme p-6 md:flex print:hidden"
        style={{ background: "var(--sidebar-bg)" }}
      >
        <NavBody />
      </aside>

      <main className="min-w-0 flex-1 px-3 py-4 sm:p-6 md:p-8">{children}</main>
    </div>
  );
}

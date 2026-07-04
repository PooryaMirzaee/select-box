"use client";

import Link from "next/link";
import { Menu, ShoppingBag, User } from "@/components/icons";
import { useCallback, useEffect, useState } from "react";

import { LoginModal } from "@/components/auth/LoginModal";
import { SelectBoxLogo } from "@/components/brand/SelectBoxLogo";
import {
  CategoryMegaMenuDesktop,
  CategoryMegaMenuMobile,
} from "@/components/shop/CategoryMegaMenu";
import { ContactMobileSection } from "@/components/shop/ShopContact";
import { useCart } from "@/components/shop/CartProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { CategoryNavNode } from "@/lib/category-nav";
import type { HeaderNavLink } from "@/lib/header-nav";
import type { ShopContactInfo } from "@/lib/contact-info";
import { fetchMe, type AuthUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Props = {
  categoryNav?: CategoryNavNode[];
  headerNav?: HeaderNavLink[];
  contact?: Partial<ShopContactInfo> | null;
};

function NavLinkItem({
  link,
  className,
  onNavigate,
}: {
  link: HeaderNavLink;
  className: string;
  onNavigate?: () => void;
}) {
  const external = link.open_in_new_tab || /^https?:\/\//i.test(link.href);
  if (external) {
    return (
      <a
        href={link.href}
        className={className}
        target={link.open_in_new_tab ? "_blank" : undefined}
        rel={link.open_in_new_tab ? "noreferrer" : undefined}
        onClick={onNavigate}
      >
        {link.label_fa}
      </a>
    );
  }
  return (
    <Link href={link.href} className={className} onClick={onNavigate}>
      {link.label_fa}
    </Link>
  );
}

export function Header({ categoryNav = [], headerNav = [], contact }: Props) {
  const { itemCount, openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [me, setMe] = useState<AuthUser | null>(null);

  const refreshUser = useCallback(async () => {
    setMe(await fetchMe());
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const accountLabel = me?.full_name?.trim() || (me ? "حساب من" : "ورود");
  const closeMobileMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-theme bg-header backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <SelectBoxLogo size="sm" className="sm:hidden" priority />
          <SelectBoxLogo
            size="md"
            className="hidden sm:inline-flex"
            priority
            imageStyle={{ height: 66, width: 44, maxHeight: 80 }}
          />

          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            {headerNav.map((link) => (
              <NavLinkItem
                key={link.id}
                link={link}
                className="transition hover:text-[var(--fg)]"
              />
            ))}
            <CategoryMegaMenuDesktop categories={categoryNav} />
            {me ? (
              <Link href="/account" className="inline-flex items-center gap-1 transition hover:text-[var(--fg)]">
                <User className="h-3.5 w-3.5" />
                {accountLabel}
              </Link>
            ) : (
              <button
                type="button"
                className="transition hover:text-[var(--fg)]"
                onClick={() => setLoginOpen(true)}
              >
                ورود
              </button>
            )}
          </nav>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/account"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition hover:text-[var(--fg)] md:hidden"
              aria-label="حساب"
            >
              <User className="h-5 w-5" />
            </Link>
            <button
              type="button"
              className="min-h-[44px] min-w-[44px] rounded-full p-2 text-muted md:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="منو"
              aria-expanded={menuOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={openCart}
              className={cn(
                "relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition hover:text-[var(--fg)]",
                itemCount > 0 && "text-[var(--fg)]",
              )}
              aria-label="سبد خرید"
            >
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-bold text-[var(--accent-fg)]">
                  {itemCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="max-h-[min(70vh,520px)] overflow-y-auto border-t border-theme px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {headerNav.map((link) => (
                <NavLinkItem
                  key={link.id}
                  link={link}
                  className="min-h-[44px] rounded-lg px-3 py-3 text-sm"
                  onNavigate={closeMobileMenu}
                />
              ))}
              <CategoryMegaMenuMobile categories={categoryNav} onNavigate={closeMobileMenu} />
              {me ? (
                <Link
                  href="/account"
                  className="min-h-[44px] rounded-lg px-3 py-3 text-sm"
                  onClick={closeMobileMenu}
                >
                  حساب من
                </Link>
              ) : (
                <button
                  type="button"
                  className="min-h-[44px] rounded-lg px-3 py-3 text-start text-sm"
                  onClick={() => {
                    closeMobileMenu();
                    setLoginOpen(true);
                  }}
                >
                  ورود
                </button>
              )}
              <ContactMobileSection contact={contact} onNavigate={closeMobileMenu} />
            </div>
          </div>
        ) : null}
      </header>

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => void refreshUser()}
      />
    </>
  );
}

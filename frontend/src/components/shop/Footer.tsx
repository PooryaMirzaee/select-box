import Link from "next/link";
import { Palette, Sparkles } from "@/components/icons";

import { CoralayLogo } from "@/components/brand/CoralayLogo";
import { ContactFooterSection } from "@/components/shop/ShopContact";
import type { ShopSettings } from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";
import { pickContactInfo } from "@/lib/contact";

type Props = {
  settings?: ShopSettings | null;
};

export function Footer({ settings }: Props) {
  const shopName = settings?.shop_name ?? BRAND_NAME;
  const description =
    settings?.shop_description?.trim() ||
    "فروشگاه لوکس تیشرت و هودی با کاتالوگ طرح‌محور — چاپ با کیفیت، Design Lab برای ساخت و فروش طرح خودت.";
  const contact = pickContactInfo(settings);

  return (
    <footer className="relative mt-20 border-t border-theme">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent"
        aria-hidden
      />

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="card-theme grid gap-10 p-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <CoralayLogo href="/" size="md" />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
            <Link
              href="/customize"
              className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-medium text-[var(--accent-fg)] transition hover:opacity-90"
            >
              <Sparkles className="h-4 w-4" />
              شروع Design Lab
            </Link>
          </div>

          <div className="text-sm">
            <p className="mb-3 font-medium">فروشگاه</p>
            <ul className="space-y-2.5 text-muted">
              <li>
                <Link href="/business" className="transition hover:text-[var(--fg)]">
                  سفارش سازمانی
                </Link>
              </li>
              <li>
                <Link href="/browse" className="transition hover:text-[var(--fg)]">
                  دسته‌بندی‌ها
                </Link>
              </li>
              <li>
                <Link href="/catalog" className="transition hover:text-[var(--fg)]">
                  کاتالوگ
                </Link>
              </li>
              <li>
                <Link href="/customize" className="inline-flex items-center gap-1.5 transition hover:text-[var(--fg)]">
                  <Palette className="h-3.5 w-3.5" />
                  سفارشی‌سازی
                </Link>
              </li>
              <li>
                <Link href="/blog" className="transition hover:text-[var(--fg)]">
                  مجله
                </Link>
              </li>
              <li>
                <Link href="/account" className="transition hover:text-[var(--fg)]">
                  حساب کاربری
                </Link>
              </li>
            </ul>
          </div>

          <ContactFooterSection contact={contact} className="md:col-span-1" />

          <div className="text-sm">
            <p className="mb-3 font-medium">خالقین و B2B</p>
            <ul className="space-y-2.5 text-muted">
              <li>
                <Link href="/studios" className="transition hover:text-[var(--fg)]">
                  استودیوهای طراحی
                </Link>
              </li>
              <li>
                <Link href="/business" className="transition hover:text-[var(--fg)]">
                  سفارش عمده و سازمانی
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          © {new Date().getFullYear()} {shopName} — تمامی حقوق محفوظ است.
        </p>
      </div>
    </footer>
  );
}

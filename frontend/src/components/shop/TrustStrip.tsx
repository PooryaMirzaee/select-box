import { CreditCard, Headset, ShieldCheck, Truck } from "@/components/icons";

const ITEMS = [
  { icon: Truck, title: "ارسال سریع", desc: "به سراسر کشور" },
  { icon: ShieldCheck, title: "ضمانت اصالت", desc: "کالای اورجینال" },
  { icon: CreditCard, title: "پرداخت امن", desc: "درگاه معتبر" },
  { icon: Headset, title: "پشتیبانی", desc: "پاسخگویی سریع" },
] as const;

export function TrustStrip() {
  return (
    <section aria-label="مزایای خرید" className="shop-container py-4 sm:py-6">
      <ul className="grid grid-cols-2 gap-2 rounded-2xl border border-theme bg-card p-2 shadow-[var(--shadow-card)] sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-[var(--border)] sm:p-1">
        {ITEMS.map(({ icon: Icon, title, desc }) => (
          <li key={title} className="flex items-center gap-3 px-3 py-3 sm:justify-center sm:px-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)]">
              <Icon className="h-5 w-5 text-[var(--accent)]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{title}</p>
              <p className="truncate text-[11px] text-muted">{desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

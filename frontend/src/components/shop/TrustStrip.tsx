import { CreditCard, Headset, ShieldCheck, Truck } from "@/components/icons";

const ITEMS = [
  { icon: Truck, title: "ارسال سریع", desc: "به سراسر کشور" },
  { icon: ShieldCheck, title: "ضمانت اصالت", desc: "کالای اورجینال" },
  { icon: CreditCard, title: "پرداخت امن", desc: "درگاه معتبر" },
  { icon: Headset, title: "پشتیبانی", desc: "پاسخگویی سریع" },
] as const;

export function TrustStrip() {
  return (
    <section aria-label="مزایای خرید" className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, desc }) => (
          <li
            key={title}
            className="flex items-center gap-3 rounded-2xl border border-theme bg-card px-4 py-3"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)]">
              <Icon className="h-5 w-5 text-[var(--accent)]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{title}</p>
              <p className="truncate text-[11px] text-muted">{desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

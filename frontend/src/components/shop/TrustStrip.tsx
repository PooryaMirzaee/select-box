import { CreditCard, Headset, ShieldCheck, Truck } from "@/components/icons";

const ICON_MAP = {
  truck: Truck,
  shield: ShieldCheck,
  card: CreditCard,
  headset: Headset,
} as const;

export type TrustStripItem = {
  title: string;
  desc: string;
  icon?: string;
};

const DEFAULT_ITEMS: TrustStripItem[] = [
  { icon: "truck", title: "ارسال سریع", desc: "به سراسر کشور" },
  { icon: "shield", title: "ضمانت اصالت", desc: "کالای اورجینال" },
  { icon: "card", title: "پرداخت امن", desc: "درگاه معتبر" },
  { icon: "headset", title: "پشتیبانی", desc: "پاسخگویی سریع" },
];

type Props = {
  items?: TrustStripItem[];
};

export function TrustStrip({ items }: Props) {
  const list = items?.length ? items : DEFAULT_ITEMS;
  return (
    <section aria-label="مزایای خرید" className="shop-container py-4 sm:py-6">
      <ul className="grid grid-cols-2 gap-2 rounded-2xl border border-theme bg-card p-2 shadow-[var(--shadow-card)] sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-[var(--border)] sm:p-1">
        {list.map(({ icon, title, desc }, i) => {
          const Icon =
            ICON_MAP[(icon as keyof typeof ICON_MAP) || "truck"] || Truck;
          return (
            <li
              key={`${title}-${i}`}
              className="flex items-center gap-3 px-3 py-3 sm:justify-center sm:px-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)]">
                <Icon className="h-5 w-5 text-[var(--accent)]" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{title}</p>
                <p className="truncate text-[11px] text-muted">{desc}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

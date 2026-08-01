import Link from "next/link";
import type { CSSProperties } from "react";

import { BRAND_NAME, BRAND_SHORT } from "@/lib/brand";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: "text-sm",
  sm: "text-base",
  md: "text-lg sm:text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
} as const;

type Props = {
  href?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
  imageClassName?: string;
  imageStyle?: CSSProperties;
  priority?: boolean;
};

/** وردمارک متنی برند — تیتر با Capsule، اکسنت طلایی روی نام کوتاه */
export function SelectBoxLogo({ href = "/", size = "md", className }: Props) {
  const mark = (
    <span
      className={cn(
        "font-display inline-flex items-baseline gap-1.5 tracking-tight",
        SIZES[size],
        className,
      )}
    >
      <span className="font-normal text-[var(--fg)] opacity-80">فروشگاه</span>
      <span className="font-bold text-[var(--accent)]">{BRAND_SHORT}</span>
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex shrink-0 items-center transition opacity-95 hover:opacity-100"
        aria-label={BRAND_NAME}
      >
        {mark}
      </Link>
    );
  }

  return <span className="inline-flex shrink-0 items-center">{mark}</span>;
}

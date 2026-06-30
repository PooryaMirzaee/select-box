import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { BRAND_LOGO_ASPECT, BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const HEIGHTS = {
  xs: 22,
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
} as const;

type Props = {
  href?: string | null;
  size?: keyof typeof HEIGHTS;
  className?: string;
  imageClassName?: string;
  imageStyle?: CSSProperties;
  priority?: boolean;
};

export function CoralayLogo({
  href = "/",
  size = "md",
  className,
  imageClassName,
  imageStyle,
  priority = false,
}: Props) {
  const height = HEIGHTS[size];
  const width = Math.round(height * BRAND_LOGO_ASPECT);
  const displayHeight = typeof imageStyle?.height === "number" ? imageStyle.height : height;
  const displayWidth = typeof imageStyle?.width === "number" ? imageStyle.width : width;

  const image = (
    <Image
      src={BRAND_LOGO_SRC}
      alt={BRAND_NAME}
      width={displayWidth}
      height={displayHeight}
      priority={priority}
      className={cn(
        "h-auto max-w-full object-contain",
        "dark:invert",
        imageClassName,
      )}
      style={{ height, width: "auto", maxHeight: height, ...imageStyle }}
    />
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn("inline-flex shrink-0 items-center transition opacity-90 hover:opacity-100", className)}
        aria-label={BRAND_NAME}
      >
        {image}
      </Link>
    );
  }

  return <span className={cn("inline-flex shrink-0 items-center", className)}>{image}</span>;
}

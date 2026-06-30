"use client";

import type { Icon } from "@phosphor-icons/react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

export type BrutalIconProps = React.ComponentProps<Icon> & {
  className?: string;
};

/** آیکون bold — سبک بروتالیست */
export function createIcon(IconComponent: Icon, defaultSize = 20) {
  const BrutalIcon = forwardRef<SVGSVGElement, BrutalIconProps>(function BrutalIcon(
    { weight = "bold", size = defaultSize, className, ...props },
    ref,
  ) {
    return (
      <IconComponent
        ref={ref}
        weight={weight}
        size={size}
        className={cn("shrink-0", className)}
        {...props}
      />
    );
  });
  BrutalIcon.displayName = "BrutalIcon";
  return BrutalIcon;
}

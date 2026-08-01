import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-full font-medium transition duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm hover:opacity-90 active:opacity-100",
        variant === "ghost" && "text-muted hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]",
        variant === "outline" &&
          "border border-theme text-[var(--fg)] hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] hover:bg-[var(--bg-elevated)]",
        size === "sm" && "min-h-[40px] px-4 text-xs",
        size === "md" && "min-h-[44px] px-6 text-sm",
        size === "lg" && "min-h-[52px] px-8 text-base",
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";

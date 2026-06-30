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
        "inline-flex items-center justify-center rounded-full font-medium transition active:scale-[0.98] disabled:opacity-50",
        variant === "primary" &&
          "bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90",
        variant === "ghost" && "text-muted hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]",
        variant === "outline" && "border border-theme text-[var(--fg)] hover:opacity-80",
        size === "sm" && "px-4 py-2 text-xs",
        size === "md" && "px-6 py-3 text-sm",
        size === "lg" && "px-8 py-4 text-base",
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";

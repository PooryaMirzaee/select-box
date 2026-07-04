"use client";

import Link from "next/link";

import { ErrorIllustration } from "@/components/errors/ErrorIllustration";
import { SelectBoxLogo } from "@/components/brand/SelectBoxLogo";
import { Button } from "@/components/ui/Button";
import {
  ERROR_CONTENT,
  errorActions,
  type ErrorKind,
  type ErrorSurface,
} from "@/lib/errors";
import { cn } from "@/lib/utils";

type Props = {
  kind?: ErrorKind;
  surface?: ErrorSurface;
  standalone?: boolean;
  compact?: boolean;
  onRetry?: () => void;
  className?: string;
};

export function ErrorPage({
  kind = "not_found",
  surface = "shop",
  standalone = false,
  compact = false,
  onRetry,
  className,
}: Props) {
  const content = ERROR_CONTENT[kind];
  const actions = errorActions(kind, surface);

  return (
    <div
      className={cn(
        "error-page",
        standalone && "error-page--standalone",
        compact && "error-page--compact",
        className,
      )}
    >
      {standalone ? (
        <header className="error-page-brand">
          <SelectBoxLogo href="/" size="lg" />
        </header>
      ) : null}

      <div className="error-page-inner">
        <ErrorIllustration kind={kind} code={content.code} codeFa={content.codeFa} />

        <div className="error-page-copy">
          <p className="error-page-kicker">{content.codeFa ?? content.code}</p>
          <h1 className="error-page-title">{content.title}</h1>
          <p className="error-page-desc">{content.description}</p>
          {content.hint ? <p className="error-page-hint">{content.hint}</p> : null}
        </div>

        <div className="error-page-actions">
          {actions.map((action) => {
            if (action.retry) {
              return (
                <Button
                  key={action.label}
                  type="button"
                  variant={action.primary ? "primary" : "outline"}
                  onClick={() => onRetry?.()}
                >
                  {action.label}
                </Button>
              );
            }
            if (!action.href) return null;
            return (
              <Link
                key={action.label}
                href={action.href}
                className={cn(
                  "inline-flex items-center justify-center rounded-full font-medium transition active:scale-[0.98]",
                  action.primary
                    ? "bg-[var(--accent)] px-6 py-3 text-sm text-[var(--accent-fg)] hover:opacity-90"
                    : "border border-theme px-6 py-3 text-sm text-[var(--fg)] hover:opacity-80",
                )}
              >
                {action.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

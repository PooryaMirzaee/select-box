import type { ReactNode } from "react";

export function LegalArticle({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl tracking-tight sm:text-4xl">{title}</h1>
      <div className="prose-shop mt-8 space-y-4 text-sm leading-8 text-muted [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[var(--fg)] [&_a]:text-[var(--accent)]">
        {children}
      </div>
    </article>
  );
}

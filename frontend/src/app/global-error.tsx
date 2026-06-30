"use client";

import { ErrorPage } from "@/components/errors/ErrorPage";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen font-sans antialiased">
        <ErrorPage kind="server_error" surface="standalone" standalone onRetry={reset} />
      </body>
    </html>
  );
}

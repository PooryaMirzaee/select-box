"use client";

import { useEffect } from "react";

import { ErrorPage } from "@/components/errors/ErrorPage";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorPage kind="server_error" surface="standalone" standalone onRetry={reset} />;
}

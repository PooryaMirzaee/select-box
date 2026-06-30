"use client";

import { useEffect } from "react";

import { ErrorPage } from "@/components/errors/ErrorPage";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorPage kind="server_error" surface="admin" compact onRetry={reset} />;
}

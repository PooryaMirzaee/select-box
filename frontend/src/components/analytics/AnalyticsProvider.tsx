"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { beaconPageView, collectPageView, sendHeartbeat } from "@/lib/analytics";

const HEARTBEAT_MS = 30_000;

/** ردیابی بازدید صفحه، نشست و heartbeat — بدون ردیابی پنل ادمین */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lastPathRef = useRef("");
  const skip = pathname.startsWith("/admin");

  useEffect(() => {
    if (skip) return;
    if (pathname === lastPathRef.current) return;
    lastPathRef.current = pathname;
    void collectPageView(pathname);
  }, [pathname, skip]);

  useEffect(() => {
    if (skip) return;
    const timer = setInterval(() => void sendHeartbeat(), HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [skip]);

  useEffect(() => {
    if (skip) return;
    const onLeave = () => beaconPageView(pathname);
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, [pathname, skip]);

  return <>{children}</>;
}

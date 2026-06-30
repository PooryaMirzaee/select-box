"use client";

import { useEffect, useState } from "react";

/** true بعد از hydrate — برای جلوگیری از mismatch انیمیشن‌های framer-motion */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

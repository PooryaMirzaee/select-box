"use client";

import { useEffect, useState, type RefObject } from "react";

import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/fabricMockup/designLabCanvas";

/** فاصلهٔ امن از لبه‌های ظرف تا بوم به لبه نچسبد */
const FIT_PADDING = 24;

/**
 * مقیاس نمایشی بوم را با اندازهٔ ظرف هماهنگ می‌کند (auto-fit).
 * resolution داخلی Fabric ثابت می‌ماند؛ فقط مقیاس نمایش تغییر می‌کند.
 *
 * @param maxScale سقف مقیاس (پیش‌فرض ۱ تا روی دسکتاپ بزرگ‌نمایی تار رخ ندهد)
 */
export function useCanvasFit(ref: RefObject<HTMLElement | null>, maxScale = 1): number {
  const [fitScale, setFitScale] = useState(maxScale);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const compute = () => {
      const availW = el.clientWidth - FIT_PADDING;
      const availH = el.clientHeight - FIT_PADDING;
      if (availW <= 0 || availH <= 0) return;
      const scale = Math.min(availW / CANVAS_WIDTH, availH / CANVAS_HEIGHT, maxScale);
      const next = +Math.max(scale, 0.2).toFixed(3);
      setFitScale((prev) => (Math.abs(prev - next) > 0.004 ? next : prev));
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, maxScale]);

  return fitScale;
}

export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "failed",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال‌شده",
  delivered: "تحویل‌شده",
  cancelled: "لغو‌شده",
  failed: "ناموفق",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  paid: "bg-green-500/15 text-green-600 dark:text-green-400",
  processing: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  shipped: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  delivered: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-zinc-500/15 text-muted",
  failed: "bg-red-500/15 text-red-600 dark:text-red-400",
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
}

export function orderStatusColor(status: string): string {
  return ORDER_STATUS_COLORS[status as OrderStatus] ?? "bg-surface text-muted";
}

export const PRODUCT_PUBLISH_CHECKS = [
  { key: "title", label: "عنوان محصول" },
  { key: "slug", label: "اسلاگ" },
  { key: "base_price", label: "قیمت پایه" },
  { key: "variations", label: "حداقل یک تنوع (رنگ/سایز)" },
  { key: "images", label: "حداقل یک تصویر" },
] as const;

export type ProductPublishCheck = {
  ok: boolean;
  label: string;
};

export function evaluateProductPublish(form: {
  title: string;
  slug: string;
  base_price: string;
  variationCount: number;
  imageCount: number;
}): ProductPublishCheck[] {
  return [
    { ok: !!form.title.trim(), label: "عنوان محصول" },
    { ok: !!form.slug.trim(), label: "اسلاگ" },
    { ok: !!form.base_price && Number(form.base_price) > 0, label: "قیمت پایه" },
    { ok: form.variationCount > 0, label: "حداقل یک تنوع (رنگ/سایز)" },
    { ok: form.imageCount > 0, label: "حداقل یک تصویر" },
  ];
}

export function canPublishProduct(checks: ProductPublishCheck[]): boolean {
  return checks.every((c) => c.ok);
}

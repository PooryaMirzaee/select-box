const colors: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  skipped: "bg-amber-100 text-amber-800",
  pending: "bg-blue-100 text-blue-800",
  published: "bg-emerald-100 text-emerald-800",
  draft: "bg-amber-100 text-amber-800",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = colors[status] ?? "bg-gray-100 text-gray-700";
  const labels: Record<string, string> = {
    success: "موفق",
    failed: "خطا",
    skipped: "رد شده",
    pending: "در انتظار",
    published: "منتشر شده",
    draft: "پیش‌نویس",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {labels[status] ?? status}
    </span>
  );
}

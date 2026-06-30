import { useEffect, useState } from "react";
import { api, type HistoryRecord } from "../lib/api";
import { StatusBadge } from "../lib/StatusBadge";
import { formatDate } from "../lib/utils";

export function HistoryPage() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.history().then(setRecords).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">تاریخچه انتشار</h1>

      {loading ? (
        <p className="text-[var(--color-muted)]">در حال بارگذاری...</p>
      ) : records.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white p-12 text-center text-[var(--color-muted)]">
          هنوز انتشاری ثبت نشده
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[var(--color-muted)]">
              <tr>
                <th className="text-right p-3 font-medium">زمان</th>
                <th className="text-right p-3 font-medium">محصول</th>
                <th className="text-right p-3 font-medium">کانال</th>
                <th className="text-right p-3 font-medium">وضعیت</th>
                <th className="text-right p-3 font-medium">پیام</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t border-[var(--color-border)]">
                  <td className="p-3 text-[var(--color-muted)] whitespace-nowrap">{formatDate(r.created_at)}</td>
                  <td className="p-3 font-medium">{r.product_slug}</td>
                  <td className="p-3">{r.channel_id}</td>
                  <td className="p-3"><StatusBadge status={r.status} /></td>
                  <td className="p-3 text-[var(--color-muted)] max-w-xs truncate">{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

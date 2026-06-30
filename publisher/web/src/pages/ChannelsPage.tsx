import { useEffect, useState } from "react";
import { api, type Channel } from "../lib/api";

export function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.channels().then(setChannels).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">کانال‌های انتشار</h1>
      <p className="text-sm text-[var(--color-muted)] mb-6">
        فعال/غیرفعال کردن کانال‌ها از فایل <code className="bg-gray-100 px-1 rounded">config/channels.yaml</code>
      </p>

      {loading ? (
        <p className="text-[var(--color-muted)]">در حال بارگذاری...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl border p-5 bg-white ${
                c.enabled ? "border-[var(--color-border)]" : "border-dashed border-gray-300 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-xs text-[var(--color-muted)]">{c.id}</p>
                </div>
                <div className="flex gap-2">
                  <Badge ok={c.enabled} label={c.enabled ? "فعال" : "غیرفعال"} />
                  <Badge ok={c.configured} label={c.configured ? "پیکربندی شده" : "نیاز به تنظیم"} warn={!c.configured} />
                </div>
              </div>
              <p className="text-sm text-gray-600">{c.description}</p>
              {c.errors.length > 0 && (
                <ul className="mt-3 text-xs text-red-600 space-y-1">
                  {c.errors.map((e) => (
                    <li key={e}>• {e}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ ok, label, warn }: { ok: boolean; label: string; warn?: boolean }) {
  const cls = ok
    ? "bg-emerald-100 text-emerald-800"
    : warn
      ? "bg-amber-100 text-amber-800"
      : "bg-gray-100 text-gray-600";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, type Channel, type Product, type PublishResult } from "../lib/api";
import { StatusBadge } from "../lib/StatusBadge";

export function PublishPage() {
  const [params] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [dryRun, setDryRun] = useState(true);
  const [results, setResults] = useState<PublishResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [auth, setAuth] = useState<{ logged_in: boolean } | null>(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    api.authStatus().then(setAuth).catch(console.error);
    api.products().then((items) => {
      setProducts(items);
      const pre = params.get("product");
      if (pre) setSelectedProducts(new Set([pre]));
    }).catch((e) => setError(e.message));
    api.channels().then((ch) => {
      setChannels(ch.filter((c) => c.enabled));
      setSelectedChannels(new Set(ch.filter((c) => c.enabled && c.configured).map((c) => c.id)));
    }).catch(console.error);
  }, [params]);

  const toggle = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const handleLogin = async () => {
    setError("");
    try {
      await api.login(phone, password);
      setAuth({ logged_in: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ورود");
    }
  };

  const handlePublish = async () => {
    if (selectedProducts.size === 0 || selectedChannels.size === 0) {
      setError("حداقل یک محصول و یک کانال انتخاب کنید");
      return;
    }
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const res = await api.publish(
        [...selectedProducts],
        [...selectedChannels],
        dryRun,
      );
      setResults(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در انتشار");
    } finally {
      setLoading(false);
    }
  };

  if (auth && !auth.logged_in) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-bold mb-2">ورود</h1>
        <p className="text-sm text-[var(--color-muted)] mb-6">
          برای دریافت محصولات از API، ابتدا وارد شوید
        </p>
        {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm mb-4">{error}</div>}
        <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-white p-5">
          <input
            type="text"
            placeholder="شماره موبایل"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            dir="ltr"
          />
          <input
            type="password"
            placeholder="رمز عبور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            dir="ltr"
          />
          <button
            onClick={handleLogin}
            className="w-full rounded-lg bg-[var(--color-brand)] py-2.5 text-white text-sm font-medium hover:bg-[var(--color-brand-dark)]"
          >
            ورود
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">انتشار محصول</h1>

      {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm mb-4">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
          <h2 className="font-semibold mb-3">انتخاب محصول</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {products.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] p-3 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedProducts.has(p.slug)}
                  onChange={() => toggle(selectedProducts, p.slug, setSelectedProducts)}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.title}</div>
                  <div className="text-xs text-[var(--color-muted)]">{p.slug}</div>
                </div>
                <StatusBadge status={p.status} />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
          <h2 className="font-semibold mb-3">انتخاب کانال</h2>
          <div className="space-y-2">
            {channels.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] p-3 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedChannels.has(c.id)}
                  onChange={() => toggle(selectedChannels, c.id, setSelectedChannels)}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-[var(--color-muted)]">{c.description}</div>
                </div>
                {!c.configured && (
                  <span className="text-xs text-amber-600">نیاز به تنظیم</span>
                )}
              </label>
            ))}
          </div>
        </section>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
          حالت آزمایشی (بدون اجرای واقعی)
        </label>
        <button
          onClick={handlePublish}
          disabled={loading}
          className="rounded-lg bg-[var(--color-brand)] px-5 py-2.5 text-white text-sm font-medium hover:bg-[var(--color-brand-dark)] disabled:opacity-50"
        >
          {loading ? "در حال اجرا..." : dryRun ? "شبیه‌سازی انتشار" : "انتشار"}
        </button>
      </div>

      {results && (
        <div className="space-y-4">
          <h2 className="font-semibold">نتیجه</h2>
          {results.map((run) => (
            <div key={run.run_id} className="rounded-xl border border-[var(--color-border)] bg-white p-5">
              <div className="font-medium mb-3">
                {run.product_title}
                <span className="text-xs text-[var(--color-muted)] mr-2">#{run.run_id}</span>
              </div>
              <div className="space-y-2">
                {run.results.map((r) => (
                  <div key={r.channel_id} className="flex items-start gap-3 text-sm">
                    <StatusBadge status={r.status} />
                    <div>
                      <span className="font-medium">{r.channel_id}</span>
                      <span className="text-[var(--color-muted)]"> — {r.message}</span>
                      {r.external_url && (
                        <a href={r.external_url} target="_blank" rel="noreferrer" className="block text-[var(--color-brand)] text-xs mt-0.5">
                          {r.external_url}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

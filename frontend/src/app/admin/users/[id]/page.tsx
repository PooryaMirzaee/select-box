"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { fetchAdminUser, patchAdminUser, type UserAdminDetail } from "@/lib/admin-users";
import { orderStatusLabel } from "@/lib/admin-status";
import { formatToman } from "@/lib/utils";

export default function AdminUserDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [user, setUser] = useState<UserAdminDetail | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState(true);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const token = () => localStorage.getItem("selectbox_admin_token")!;

  const load = useCallback(() => {
    if (!Number.isFinite(id)) return;
    setLoading(true);
    fetchAdminUser(token(), id)
      .then((u) => {
        setUser(u);
        setFullName(u.full_name ?? "");
        setEmail(u.email ?? "");
        setRole(u.role);
        setActive(u.is_active);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setMsg(null);
    try {
      const u = await patchAdminUser(token(), id, {
        full_name: fullName || null,
        email: email || null,
        role,
        is_active: active,
        password: password || undefined,
      });
      setUser(u);
      setPassword("");
      setMsg("ذخیره شد");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "خطا");
    }
  }

  if (loading) return <p className="text-muted">...</p>;
  if (!user) return <p className="text-red-500">کاربر پیدا نشد</p>;

  return (
    <div>
      <Link href="/admin/users" className="text-sm text-[var(--accent)] hover:underline">
        ← کاربران
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">
        {user.full_name || user.phone}
      </h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card-theme space-y-3 p-6">
          <h2 className="font-medium">ویرایش</h2>
          <input
            className="w-full rounded-lg border border-theme px-3 py-2 text-sm"
            placeholder="نام"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-theme px-3 py-2 text-sm"
            placeholder="ایمیل"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            className="w-full rounded-lg border border-theme px-3 py-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="customer">customer</option>
            <option value="operator">operator</option>
            <option value="admin">admin</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            حساب فعال
          </label>
          <input
            type="password"
            className="w-full rounded-lg border border-theme px-3 py-2 text-sm"
            placeholder="رمز جدید (staff)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button onClick={() => void save()}>ذخیره</Button>
          {msg ? <p className="text-sm text-[var(--accent)]">{msg}</p> : null}
        </div>

        <div className="card-theme p-6">
          <h2 className="font-medium">آمار</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">شماره</dt>
              <dd>{user.phone}</dd>
            </div>
            {user.order_count != null ? (
              <div className="flex justify-between">
                <dt className="text-muted">سفارش</dt>
                <dd>{user.order_count}</dd>
              </div>
            ) : null}
            {user.is_creator ? (
              <>
                <div className="flex justify-between">
                  <dt className="text-muted">آثار</dt>
                  <dd>{user.product_count}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">منتشرشده</dt>
                  <dd>{user.published_count}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">در انتظار</dt>
                  <dd>{user.pending_count}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">درآمد</dt>
                  <dd>{formatToman(user.total_earned ?? "0")}</dd>
                </div>
              </>
            ) : null}
          </dl>
        </div>
      </div>

      {user.recent_orders?.length ? (
        <div className="card-theme mt-6 p-6">
          <h2 className="font-medium">سفارش‌های اخیر</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {user.recent_orders.map((o) => (
              <li key={o.id} className="flex justify-between border-b border-theme/50 py-2">
                <span className="font-mono">{o.tracking_code}</span>
                <span>{orderStatusLabel(o.status)}</span>
                <span>{formatToman(o.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {user.products?.length ? (
        <div className="card-theme mt-6 p-6">
          <h2 className="font-medium">محصولات خالق</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {user.products.map((p) => (
              <li key={p.id} className="flex justify-between py-1">
                <Link href={`/admin/products`} className="hover:text-[var(--accent)]">
                  {p.title}
                </Link>
                <span className="text-muted">{p.status}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

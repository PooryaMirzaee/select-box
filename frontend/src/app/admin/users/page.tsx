"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Eye, User } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import {
  createStaffUser,
  fetchAdminUsers,
  type UserAdmin,
} from "@/lib/admin-users";
import { cn } from "@/lib/utils";

const ROLES = [
  { value: "", label: "همه نقش‌ها" },
  { value: "customer", label: "خریدار" },
  { value: "operator", label: "اپراتور" },
  { value: "admin", label: "مدیر" },
];

export default function AdminUsersPage() {
  const [items, setItems] = useState<UserAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStaff, setShowStaff] = useState(false);
  const [staffPhone, setStaffPhone] = useState("");
  const [staffPass, setStaffPass] = useState("");
  const [staffRole, setStaffRole] = useState<"admin" | "operator">("operator");
  const [staffName, setStaffName] = useState("");
  const [staffMsg, setStaffMsg] = useState<string | null>(null);

  const token = () => localStorage.getItem("selectbox_admin_token")!;

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAdminUsers(token(), {
      q: q || undefined,
      role: role || undefined,
    })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "خطا"))
      .finally(() => setLoading(false));
  }, [q, role]);

  useEffect(() => {
    load();
  }, [load]);

  async function addStaff() {
    setStaffMsg(null);
    try {
      await createStaffUser(token(), {
        phone: staffPhone,
        password: staffPass,
        role: staffRole,
        full_name: staffName || undefined,
      });
      setStaffMsg("کاربر staff ایجاد شد");
      setShowStaff(false);
      load();
    } catch (e) {
      setStaffMsg(e instanceof Error ? e.message : "خطا");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">کاربران</h1>
          <p className="mt-1 text-sm text-muted">مشتریان و پرسنل — {total} نفر</p>
        </div>
        <Button size="sm" onClick={() => setShowStaff((s) => !s)}>
          <User className="ms-1 inline h-4 w-4" />
          کاربر staff
        </Button>
      </div>

      {showStaff ? (
        <div className="card-theme mt-6 grid gap-3 p-4 sm:grid-cols-2">
          <input
            placeholder="شماره"
            className="rounded-lg border border-theme px-3 py-2 text-sm"
            value={staffPhone}
            onChange={(e) => setStaffPhone(e.target.value)}
          />
          <input
            placeholder="رمز (حداقل ۶)"
            type="password"
            className="rounded-lg border border-theme px-3 py-2 text-sm"
            value={staffPass}
            onChange={(e) => setStaffPass(e.target.value)}
          />
          <input
            placeholder="نام"
            className="rounded-lg border border-theme px-3 py-2 text-sm"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
          />
          <select
            className="rounded-lg border border-theme px-3 py-2 text-sm"
            value={staffRole}
            onChange={(e) => setStaffRole(e.target.value as "admin" | "operator")}
          >
            <option value="operator">اپراتور</option>
            <option value="admin">مدیر</option>
          </select>
          <Button className="sm:col-span-2" onClick={() => void addStaff()}>
            ایجاد
          </Button>
          {staffMsg ? <p className="text-sm text-[var(--accent)] sm:col-span-2">{staffMsg}</p> : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <input
          placeholder="جستجو شماره یا نام…"
          className="min-w-[200px] flex-1 rounded-lg border border-theme px-3 py-2 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="rounded-lg border border-theme px-3 py-2 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={load}>
          جستجو
        </Button>
      </div>

      {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-theme text-muted">
              <th className="py-2 text-start">شناسه</th>
              <th className="py-2 text-start">نام / شماره</th>
              <th className="py-2 text-start">نقش</th>
              <th className="py-2 text-start">وضعیت</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted">
                  ...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted">
                  کاربری نیست
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr key={u.id} className="border-b border-theme/60">
                  <td className="py-3">{u.id}</td>
                  <td>
                    <p className="font-medium">{u.full_name || "—"}</p>
                    <p className="text-xs text-muted">{u.phone}</p>
                  </td>
                  <td>{u.role}</td>
                  <td>
                    <span className={cn("text-xs", u.is_active ? "text-green-600" : "text-red-500")}>
                      {u.is_active ? "فعال" : "غیرفعال"}
                    </span>
                  </td>
                  <td className="text-end">
                    <Link href={`/admin/users/${u.id}`} className="inline-flex items-center gap-1 text-[var(--accent)]">
                      <Eye className="h-4 w-4" />
                      جزئیات
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

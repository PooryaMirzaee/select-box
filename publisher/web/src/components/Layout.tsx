import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/", label: "داشبورد", end: true },
  { to: "/products", label: "محصولات" },
  { to: "/publish", label: "انتشار" },
  { to: "/channels", label: "کانال‌ها" },
  { to: "/history", label: "تاریخچه" },
];

export function Layout() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 border-l border-[var(--color-border)] bg-[var(--color-card)] flex flex-col">
        <div className="p-5 border-b border-[var(--color-border)]">
          <div className="text-lg font-bold text-[var(--color-brand)]">Avan Publisher</div>
          <div className="text-xs text-[var(--color-muted)] mt-1">انتشار چندکاناله</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--color-brand)] text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  List,
  PiggyBank,
  HandCoins,
  Tags,
  LogOut,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const TABS = [
  { to: "/", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { to: "/giao-dich", label: "Giao dịch", icon: List, end: false },
  { to: "/ngan-sach", label: "Ngân sách", icon: PiggyBank, end: false },
  { to: "/du-no", label: "Dư nợ", icon: HandCoins, end: false },
  { to: "/danh-muc", label: "Danh mục", icon: Tags, end: false },
];

/**
 * Khung app: thanh bên trái trên desktop, thanh tab dưới đáy trên mobile.
 * Không có footer marketing — đây là app, không phải landing page.
 */
export function AppShell() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      {/* Side rail — desktop */}
      <aside className="hidden border-r border-rule lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:gap-1 lg:overflow-y-auto lg:p-6">
        <div className="mb-6 flex items-baseline gap-1.5">
          <span className="font-display text-xl font-semibold">Spend Assist</span>
          <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />
        </div>
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
                isActive
                  ? "bg-accent-soft font-medium text-accent-deep"
                  : "text-ink-2 hover:bg-paper-2"
              }`
            }
          >
            <Icon size={18} strokeWidth={2} aria-hidden />
            {label}
          </NavLink>
        ))}
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-auto flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted transition-colors duration-150 hover:bg-paper-2 hover:text-ink"
        >
          <LogOut size={18} strokeWidth={2} aria-hidden />
          Đăng xuất
        </button>
      </aside>

      {/* Main */}
      <main className="w-full px-4 pb-24 sm:px-6 lg:px-8 lg:pb-10">
        <Outlet />
      </main>

      {/* Bottom tabs — mobile */}
      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 whitespace-nowrap px-1 py-2 text-[11px] ${
                    isActive ? "font-medium text-accent-deep" : "text-muted"
                  }`
                }
              >
                <Icon size={20} strokeWidth={2} aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

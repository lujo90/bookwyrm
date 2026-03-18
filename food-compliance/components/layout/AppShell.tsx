"use client";

import Link from "next/link";
import { LayoutDashboard, Package, Settings } from "lucide-react";

type Tab = "dashboard" | "products" | "settings";

interface AppShellProps {
  children: React.ReactNode;
  activeTab: Tab;
}

const NAV_ITEMS: { tab: Tab; label: string; href: string; icon: React.ElementType }[] = [
  { tab: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { tab: "products",  label: "Products",  href: "/products",  icon: Package },
  { tab: "settings",  label: "Settings",  href: "/settings",  icon: Settings },
];

/**
 * AppShell wraps every authenticated page.
 *
 * Layout (top → bottom):
 *  1. Agent bar  — persistent blue banner at the very top (placeholder for now)
 *  2. Page area  — scrollable content passed as children
 *  3. Bottom nav — 3 tabs: Dashboard, Products, Settings
 */
export default function AppShell({ children, activeTab }: AppShellProps) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* ── Agent bar ──────────────────────────────────────────────────── */}
      <div className="bg-primary text-white text-sm font-medium px-4 py-2.5 flex items-center gap-2 shrink-0">
        <span className="text-xs bg-white/20 rounded px-1.5 py-0.5 font-semibold tracking-wide">
          AI
        </span>
        <span className="text-white/90">
          Your compliance assistant is ready — ask me anything
        </span>
      </div>

      {/* ── Page content ───────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* ── Bottom navigation ───────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex items-stretch h-16 z-50">
        {NAV_ITEMS.map(({ tab, label, href, icon: Icon }) => {
          const isActive = activeTab === tab;
          return (
            <Link
              key={tab}
              href={href}
              className={[
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-light hover:text-mid",
              ].join(" ")}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 2}
                className="shrink-0"
              />
              {label}
              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

"use client";

import Link from "next/link";
import { LayoutGrid, Box, Settings, Bot } from "lucide-react";
import AgentBar from "@/components/layout/AgentBar";
import TrialBanner from "@/components/ui/TrialBanner";

export type AppTab = "dashboard" | "products" | "agent" | "settings";

interface AppShellProps {
  children: React.ReactNode;
  activeTab: AppTab;
  /** Override the default agent bar message */
  agentMessage?: string;
  /** Called when the agent bar is tapped */
  onAgentClick?: () => void;
}

const NAV_ITEMS: {
  tab:   AppTab;
  label: string;
  href:  string;
  icon:  React.ElementType;
}[] = [
  { tab: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { tab: "products",  label: "Products",  href: "/products",  icon: Box        },
  { tab: "agent",     label: "Agent",     href: "/agent",     icon: Bot        },
  { tab: "settings",  label: "Settings",  href: "/settings",  icon: Settings   },
];

const AGENT_BAR_H = 44; // px
const NAV_H       = 60; // px

const DEFAULT_MESSAGE =
  "Your compliance assistant is ready — ask me anything";

/**
 * AppShell
 *
 * Wraps every authenticated page.
 *
 * Layout (top → bottom):
 *   1. AgentBar   — fixed, 44px, #EFF6FF
 *   2. Page content — scrollable, padded so it clears both fixed bars
 *   3. BottomNav  — fixed, 60px, white
 *
 * BottomNav tabs: Dashboard (grid), Products (box), Settings (cog).
 * Active colour: #2563EB. Inactive: #94A3B8. Label: 10px DM Sans 600.
 */
export default function AppShell({
  children,
  activeTab,
  agentMessage,
  onAgentClick,
}: AppShellProps) {
  return (
    <div
      style={{
        display:         "flex",
        flexDirection:   "column",
        minHeight:       "100vh",
        backgroundColor: "#F8FAFC",
      }}
    >
      {/* ── Agent bar — fixed at top ─────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          top:      0,
          left:     0,
          right:    0,
          zIndex:   40,
        }}
      >
        <AgentBar
          message={agentMessage ?? DEFAULT_MESSAGE}
          onClick={onAgentClick}
        />
      </div>

      {/* ── Page content ────────────────────────────────────────────── */}
      <main
        style={{
          flex:          1,
          paddingTop:    AGENT_BAR_H,
          paddingBottom: NAV_H,
          overflowY:     "auto",
        }}
      >
        <TrialBanner />
        {children}
      </main>

      {/* ── Bottom navigation — fixed at bottom ─────────────────────── */}
      <nav
        style={{
          position:        "fixed",
          bottom:          0,
          left:            0,
          right:           0,
          height:          NAV_H,
          backgroundColor: "white",
          borderTop:       "1px solid #E2E8F0",
          display:         "flex",
          zIndex:          50,
        }}
      >
        {NAV_ITEMS.map(({ tab, label, href, icon: Icon }) => {
          const isActive = activeTab === tab;
          const color    = isActive ? "#2563EB" : "#94A3B8";
          return (
            <Link
              key={tab}
              href={href}
              style={{
                flex:           1,
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                justifyContent: "center",
                gap:            3,
                textDecoration: "none",
                color,
              }}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
                color={color}
              />
              <span
                style={{
                  fontSize:   10,
                  fontWeight: 600,
                  color,
                  fontFamily: "var(--font-body), DM Sans, sans-serif",
                  lineHeight: 1,
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

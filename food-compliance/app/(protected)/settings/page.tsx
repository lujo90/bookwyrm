import type { Metadata } from "next";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import BillingPortalButton from "@/components/ui/BillingPortalButton";

export const metadata: Metadata = { title: "Settings" };

const NAV_ROWS: { href: string; icon: string; title: string; description: string }[] = [
  {
    href:        "/suppliers",
    icon:        "🏭",
    title:       "Suppliers",
    description: "Manage supplier approvals, risk ratings, and certifications.",
  },
  {
    href:        "/ingredients",
    icon:        "🌿",
    title:       "Ingredients Library",
    description: "Link ingredients to suppliers and track COA status.",
  },
];

export default function SettingsPage() {
  return (
    <AppShell activeTab="settings">
      <div style={{ padding: "16px 0" }}>
        <div style={{ padding: "0 16px 12px" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1E293B", fontFamily: "var(--font-body), DM Sans, sans-serif", margin: "0 0 2px" }}>
            Settings
          </h1>
          <p style={{ fontSize: 13, color: "#64748B", fontFamily: "var(--font-body), DM Sans, sans-serif", margin: 0 }}>
            Account and organisation settings.
          </p>
        </div>

        {/* Billing section */}
        <div style={{ padding: "0 16px 10px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", fontFamily: "var(--font-body), DM Sans, sans-serif", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Billing
          </p>
        </div>

        <div style={{ backgroundColor: "white", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
            <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>💳</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600, color: "#1E293B", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>
                Billing
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "#64748B", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>
                Manage your subscription and payment method.
              </p>
            </div>
            <BillingPortalButton />
          </div>
        </div>

        {/* Supply Chain section */}
        <div style={{ padding: "0 16px 10px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", fontFamily: "var(--font-body), DM Sans, sans-serif", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Supply Chain
          </p>
        </div>

        <div style={{ backgroundColor: "white", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
          {NAV_ROWS.map((row, idx) => (
            <Link key={row.href} href={row.href} style={{ textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: idx < NAV_ROWS.length - 1 ? "1px solid #E2E8F0" : "none", backgroundColor: "white" }}>
                <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{row.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600, color: "#1E293B", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>
                    {row.title}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "#64748B", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>
                    {row.description}
                  </p>
                </div>
                <span style={{ flexShrink: 0, fontSize: 16, color: "#CBD5E1" }}>›</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

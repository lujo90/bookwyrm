import type { Metadata } from "next";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = { title: "Subscription Cancelled" };

const FONT = "var(--font-body), DM Sans, sans-serif";

export default function BillingCancelPage() {
  return (
    <AppShell activeTab="settings">
      <div
        style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "60px 24px",
          textAlign:      "center",
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 16 }}>↩️</div>
        <h1
          style={{
            margin:     "0 0 12px",
            fontSize:   22,
            fontWeight: 700,
            color:      "#1E293B",
            fontFamily: FONT,
          }}
        >
          Subscription cancelled.
        </h1>
        <p
          style={{
            margin:     "0 0 32px",
            fontSize:   15,
            color:      "#64748B",
            fontFamily: FONT,
            maxWidth:   320,
          }}
        >
          No problem — you can subscribe any time from Settings.
        </p>
        <Link
          href="/settings"
          style={{
            display:         "inline-flex",
            alignItems:      "center",
            justifyContent:  "center",
            minHeight:       44,
            padding:         "0 24px",
            backgroundColor: "#F1F5F9",
            color:           "#1E293B",
            borderRadius:    8,
            textDecoration:  "none",
            fontFamily:      FONT,
            fontSize:        15,
            fontWeight:      600,
          }}
        >
          Back to settings
        </Link>
      </div>
    </AppShell>
  );
}

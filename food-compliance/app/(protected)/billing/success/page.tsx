import type { Metadata } from "next";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = { title: "Subscription Active" };

const FONT = "var(--font-body), DM Sans, sans-serif";

export default function BillingSuccessPage() {
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
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <h1
          style={{
            margin:     "0 0 12px",
            fontSize:   22,
            fontWeight: 700,
            color:      "#1E293B",
            fontFamily: FONT,
          }}
        >
          You are now subscribed.
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
          Welcome to FoodComply Pro. You can now add up to 20 products.
        </p>
        <Link
          href="/dashboard"
          style={{
            display:         "inline-flex",
            alignItems:      "center",
            justifyContent:  "center",
            minHeight:       44,
            padding:         "0 24px",
            backgroundColor: "#2563EB",
            color:           "white",
            borderRadius:    8,
            textDecoration:  "none",
            fontFamily:      FONT,
            fontSize:        15,
            fontWeight:      600,
          }}
        >
          Go to dashboard
        </Link>
      </div>
    </AppShell>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Config {
  heading: string;
  body:    string;
  button:  string;
  action:  "checkout" | "contact";
}

const CONFIGS: Record<string, Config> = {
  trial_expired: {
    heading: "Your 14-day free trial has ended.",
    body:    "Subscribe for €99/month to continue building.",
    button:  "Subscribe Now",
    action:  "checkout",
  },
  trial_limit: {
    heading: "You have reached the 2-product limit on the free trial.",
    body:    "Subscribe for €99/month to add up to 20 products.",
    button:  "Upgrade to Pro",
    action:  "checkout",
  },
  plan_limit: {
    heading: "You have reached your 20-product limit.",
    body:    "Contact us to discuss higher limits.",
    button:  "Contact Us",
    action:  "contact",
  },
  subscription_inactive: {
    heading: "Your subscription is inactive.",
    body:    "Subscribe to continue adding products.",
    button:  "Subscribe Now",
    action:  "checkout",
  },
};

const FONT = "var(--font-body), DM Sans, sans-serif";

export default function UpgradePrompt({ reason }: { reason: string }) {
  const router  = useRouter();
  const [busy, setBusy] = useState(false);
  const cfg = CONFIGS[reason] ?? CONFIGS.subscription_inactive;

  async function handleCheckout() {
    setBusy(true);
    try {
      const res  = await fetch("/api/stripe/create-checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) router.push(data.url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        margin:        "32px 16px",
        borderRadius:  12,
        border:        "1px solid #FDE68A",
        backgroundColor: "#FFFBEB",
        padding:       24,
        textAlign:     "center",
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
      <h2
        style={{
          margin:     "0 0 8px",
          fontSize:   16,
          fontWeight: 700,
          color:      "#1E293B",
          fontFamily: FONT,
        }}
      >
        {cfg.heading}
      </h2>
      <p
        style={{
          margin:     "0 0 20px",
          fontSize:   14,
          color:      "#64748B",
          fontFamily: FONT,
        }}
      >
        {cfg.body}
      </p>

      {cfg.action === "checkout" ? (
        <button
          onClick={handleCheckout}
          disabled={busy}
          style={{
            display:         "inline-flex",
            alignItems:      "center",
            justifyContent:  "center",
            minHeight:       44,
            padding:         "0 20px",
            backgroundColor: busy ? "#93C5FD" : "#2563EB",
            color:           "white",
            borderRadius:    8,
            border:          "none",
            cursor:          busy ? "not-allowed" : "pointer",
            fontFamily:      FONT,
            fontSize:        14,
            fontWeight:      600,
          }}
        >
          {busy ? "Redirecting…" : cfg.button}
        </button>
      ) : (
        <a
          href="mailto:hello@foodcomply.app"
          style={{
            display:         "inline-flex",
            alignItems:      "center",
            justifyContent:  "center",
            minHeight:       44,
            padding:         "0 20px",
            backgroundColor: "#2563EB",
            color:           "white",
            borderRadius:    8,
            textDecoration:  "none",
            fontFamily:      FONT,
            fontSize:        14,
            fontWeight:      600,
          }}
        >
          {cfg.button}
        </a>
      )}
    </div>
  );
}

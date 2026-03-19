"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const FONT = "var(--font-body), DM Sans, sans-serif";

export default function TrialBanner() {
  const router = useRouter();
  const [daysLeft, setDaysLeft]     = useState<number | null>(null);
  const [dismissed, setDismissed]   = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  useEffect(() => {
    fetch("/api/billing/trial-status")
      .then((r) => r.json())
      .then((data) => {
        if (
          data.subscriptionStatus === "trial" &&
          data.daysLeft !== null &&
          data.daysLeft <= 7
        ) {
          setDaysLeft(data.daysLeft);
        }
      })
      .catch(() => {/* silent — banner is non-critical */});
  }, []);

  if (daysLeft === null || dismissed) return null;

  async function handleSubscribe() {
    setCheckoutBusy(true);
    try {
      const res  = await fetch("/api/stripe/create-checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) router.push(data.url);
    } finally {
      setCheckoutBusy(false);
    }
  }

  const label =
    daysLeft === 0
      ? "Your free trial ends today."
      : daysLeft === 1
        ? "Your free trial ends tomorrow."
        : `Your free trial ends in ${daysLeft} days.`;

  return (
    <div
      style={{
        backgroundColor: "#FFFBEB",
        borderBottom:    "1px solid #FDE68A",
        padding:         "10px 16px",
        display:         "flex",
        alignItems:      "center",
        gap:             12,
        flexWrap:        "wrap",
      }}
    >
      <span
        style={{
          flex:       1,
          fontSize:   13,
          color:      "#92400E",
          fontFamily: FONT,
          fontWeight: 500,
        }}
      >
        {label} Subscribe to keep access.
      </span>
      <button
        onClick={handleSubscribe}
        disabled={checkoutBusy}
        style={{
          minHeight:       44,
          padding:         "0 14px",
          backgroundColor: checkoutBusy ? "#93C5FD" : "#2563EB",
          color:           "white",
          border:          "none",
          borderRadius:    8,
          cursor:          checkoutBusy ? "not-allowed" : "pointer",
          fontFamily:      FONT,
          fontSize:        13,
          fontWeight:      600,
          flexShrink:      0,
        }}
      >
        {checkoutBusy ? "…" : "Subscribe"}
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          minWidth:        44,
          minHeight:       44,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          background:      "none",
          border:          "none",
          cursor:          "pointer",
          color:           "#92400E",
          fontSize:        18,
          flexShrink:      0,
          padding:         0,
        }}
      >
        ×
      </button>
    </div>
  );
}

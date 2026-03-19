"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FONT = "var(--font-body), DM Sans, sans-serif";

export default function BillingPortalButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      const res  = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        router.push(data.url);
      } else {
        setError(data.error ?? "Could not open billing portal.");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={busy}
        style={{
          minHeight:       44,
          padding:         "0 16px",
          backgroundColor: busy ? "#F1F5F9" : "white",
          color:           busy ? "#94A3B8" : "#2563EB",
          border:          "1.5px solid #E2E8F0",
          borderRadius:    8,
          fontSize:        14,
          fontWeight:      600,
          fontFamily:      FONT,
          cursor:          busy ? "not-allowed" : "pointer",
        }}
      >
        {busy ? "Opening…" : "Manage Billing"}
      </button>
      {error && (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#DC2626", fontFamily: FONT }}>
          {error}
        </p>
      )}
    </div>
  );
}

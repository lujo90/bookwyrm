"use client";

import { useEffect, useState } from "react";

interface CategoryBarProps {
  /** Category label shown on the left */
  label: string;
  /** 0–100 fill percentage */
  percentage: number;
  /** Hex colour for the fill and the percentage label */
  color: string;
}

/**
 * CategoryBar
 *
 * Horizontal progress bar used in compliance breakdowns.
 *
 * Layout:
 *   [label]        [percentage %]
 *   [━━━━━━━━░░░░░░░░░░░░░░░░░░░]
 *
 * Fill animates from 0 → percentage on mount (0.6s ease).
 * Bar height: 4px. Track: #E2E8F0. Border-radius: 2px.
 * Label: 12px DM Sans 600, #475569.
 * Percentage: 12px DM Sans 700, matching fill colour.
 */
export default function CategoryBar({ label, percentage, color }: CategoryBarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const clamped = Math.min(100, Math.max(0, Math.round(percentage)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* Labels */}
      <div
        style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
        }}
      >
        <span
          style={{
            fontSize:   12,
            fontWeight: 600,
            color:      "#475569",
            fontFamily: "var(--font-body), DM Sans, sans-serif",
            lineHeight: 1,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize:   12,
            fontWeight: 700,
            color,
            fontFamily: "var(--font-body), DM Sans, sans-serif",
            lineHeight: 1,
          }}
        >
          {clamped}%
        </span>
      </div>

      {/* Track + fill */}
      <div
        style={{
          height:          4,
          backgroundColor: "#E2E8F0",
          borderRadius:    2,
          overflow:        "hidden",
        }}
      >
        <div
          style={{
            height:          "100%",
            width:           `${mounted ? clamped : 0}%`,
            backgroundColor: color,
            borderRadius:    2,
            transition:      "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

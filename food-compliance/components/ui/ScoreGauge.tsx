"use client";

import { useEffect, useState } from "react";

interface ScoreGaugeProps {
  /** 0–100 */
  score: number;
  size?: "sm" | "md" | "lg";
}

// px dimensions per size
const SIZE_PX = { sm: 52, md: 80, lg: 96 } as const;

// Milestone labels shown on md and lg only
const MILESTONES = [
  { max: 24,  label: "Not started"  },
  { max: 74,  label: "In progress"  },
  { max: 89,  label: "Nearly ready" },
  { max: 99,  label: "Launch ready" },
  { max: 100, label: "Approved"     },
] as const;

function getColor(score: number): string {
  if (score <= 24) return "#DC2626"; // danger
  if (score <= 74) return "#D97706"; // warning
  if (score <= 89) return "#2563EB"; // primary
  return "#16A34A";                  // success
}

function getMilestone(score: number): string {
  for (const { max, label } of MILESTONES) {
    if (score <= max) return label;
  }
  return "Approved";
}

export default function ScoreGauge({ score, size = "md" }: ScoreGaugeProps) {
  // Animate from 0 → actual value on mount
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const clamped    = Math.min(100, Math.max(0, Math.round(score)));
  const px         = SIZE_PX[size];
  const stroke     = Math.max(3, Math.round(px * 0.07)); // 7% of diameter
  const center     = px / 2;
  const radius     = center - stroke / 2 - 1;            // tiny inset so stroke doesn't clip
  const circ       = 2 * Math.PI * radius;
  const progress   = mounted ? (clamped / 100) * circ : 0;
  const color      = getColor(clamped);
  const showLabel  = size !== "sm";
  const milestone  = getMilestone(clamped);

  // Score text size scales with gauge
  const scoreFontSize = size === "sm" ? 14 : size === "md" ? 20 : 24;
  const labelFontSize = 11;

  // Extra SVG height to accommodate the label below the ring
  const labelGap    = 8;
  const svgHeight   = showLabel ? px + labelGap + labelFontSize + 4 : px;
  const labelY      = px + labelGap + labelFontSize / 2;

  return (
    <svg
      width={px}
      height={svgHeight}
      viewBox={`0 0 ${px} ${svgHeight}`}
      aria-label={`Compliance score: ${clamped} — ${milestone}`}
      role="img"
      style={{ overflow: "visible" }}
    >
      {/* Track ring */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#E2E8F0"
        strokeWidth={stroke}
      />

      {/* Progress arc — starts at 12 o'clock */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${progress} ${circ}`}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />

      {/* Score number — Outfit 800 */}
      <text
        x={center}
        y={center}
        dominantBaseline="central"
        textAnchor="middle"
        fontSize={scoreFontSize}
        fontWeight="800"
        fill={color}
        fontFamily="var(--font-display), Outfit, sans-serif"
      >
        {clamped}
      </text>

      {/* Milestone label — DM Sans 600 uppercase — md and lg only */}
      {showLabel && (
        <text
          x={center}
          y={labelY}
          dominantBaseline="central"
          textAnchor="middle"
          fontSize={labelFontSize}
          fontWeight="600"
          fill={color}
          fontFamily="var(--font-body), DM Sans, sans-serif"
          letterSpacing="0.06em"
        >
          {milestone.toUpperCase()}
        </text>
      )}
    </svg>
  );
}

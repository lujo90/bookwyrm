"use client";

import type { Supplier, RiskRating } from "@/types/database";

interface SupplierRowProps {
  supplier: Supplier;
  onEdit:   (supplier: Supplier) => void;
}

function riskConfig(rating: RiskRating) {
  return {
    low:    { label: "Low risk",    bg: "#F0FDF4", color: "#16A34A" },
    medium: { label: "Medium risk", bg: "#FFFBEB", color: "#D97706" },
    high:   { label: "High risk",   bg: "#FEF2F2", color: "#DC2626" },
  }[rating] ?? { label: rating, bg: "#F1F5F9", color: "#475569" };
}

function reviewStatus(reviewDate: string | null): { label: string; color: string } {
  if (!reviewDate) return { label: "No review set", color: "#94A3B8" };
  const diff = Math.ceil((new Date(reviewDate).getTime() - Date.now()) / 86_400_000);
  if (diff < 0)  return { label: "Review overdue",       color: "#DC2626" };
  if (diff <= 30) return { label: `Review in ${diff}d`,  color: "#D97706" };
  return { label: `Review ${new Date(reviewDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`, color: "#64748B" };
}

export default function SupplierRow({ supplier, onEdit }: SupplierRowProps) {
  const risk   = riskConfig(supplier.risk_rating as RiskRating);
  const review = reviewStatus(supplier.review_date);

  return (
    <div
      style={{
        backgroundColor: "white",
        borderBottom:    "1px solid #E2E8F0",
        padding:         "12px 16px",
        display:         "flex",
        alignItems:      "center",
        gap:             10,
      }}
    >
      {/* Approved indicator */}
      <div
        style={{
          flexShrink:      0,
          width:           8,
          height:          8,
          borderRadius:    "50%",
          backgroundColor: supplier.approved ? "#16A34A" : "#DC2626",
          marginTop:       2,
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + country */}
        <p
          style={{
            margin:       0,
            fontSize:     14,
            fontWeight:   600,
            color:        "#1E293B",
            fontFamily:   "var(--font-body), DM Sans, sans-serif",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
          }}
        >
          {supplier.name}
          {supplier.country && (
            <span style={{ fontWeight: 400, color: "#64748B", marginLeft: 6 }}>
              {supplier.country}
            </span>
          )}
        </p>

        {/* Badges row */}
        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
          {/* Approval badge */}
          <span
            style={{
              fontSize:        10,
              fontWeight:      700,
              textTransform:   "uppercase",
              letterSpacing:   "0.05em",
              padding:         "2px 6px",
              borderRadius:    4,
              backgroundColor: supplier.approved ? "#F0FDF4" : "#FEF2F2",
              color:           supplier.approved ? "#16A34A" : "#DC2626",
              fontFamily:      "var(--font-body), DM Sans, sans-serif",
            }}
          >
            {supplier.approved ? "Approved" : "Not approved"}
          </span>

          {/* Risk badge */}
          <span
            style={{
              fontSize:        10,
              fontWeight:      600,
              textTransform:   "uppercase",
              letterSpacing:   "0.05em",
              padding:         "2px 6px",
              borderRadius:    4,
              backgroundColor: risk.bg,
              color:           risk.color,
              fontFamily:      "var(--font-body), DM Sans, sans-serif",
            }}
          >
            {risk.label}
          </span>

          {/* Review date */}
          <span
            style={{
              fontSize:   11,
              color:      review.color,
              fontFamily: "var(--font-body), DM Sans, sans-serif",
            }}
          >
            {review.label}
          </span>
        </div>
      </div>

      {/* Edit button */}
      <button
        onClick={() => onEdit(supplier)}
        style={{
          flexShrink:      0,
          height:          32,
          paddingLeft:     12,
          paddingRight:    12,
          borderRadius:    6,
          border:          "1px solid #E2E8F0",
          backgroundColor: "white",
          fontSize:        12,
          fontWeight:      600,
          color:           "#475569",
          fontFamily:      "var(--font-body), DM Sans, sans-serif",
          cursor:          "pointer",
          whiteSpace:      "nowrap",
        }}
      >
        Edit
      </button>
    </div>
  );
}

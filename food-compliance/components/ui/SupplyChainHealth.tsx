"use client";

/**
 * SupplyChainHealth
 *
 * A coloured banner summarising the supply chain status for a product.
 *
 * Health rules:
 *  RED    — any ingredient has no supplier OR any supplier is not approved OR
 *            any COA is expired or missing
 *  AMBER  — any supplier review_date is past or ≤ 30 days away (no critical issues)
 *  GREEN  — all ingredients linked to approved suppliers with valid COAs
 */

import type { Supplier } from "@/types/database";
import type { IngredientWithSupplier } from "@/app/api/ingredients/route";
import { getCoaStatus } from "@/components/ui/IngredientRow";

export type HealthStatus = "green" | "amber" | "red" | "empty";

export function computeHealth(
  ingredients: IngredientWithSupplier[],
): HealthStatus {
  if (ingredients.length === 0) return "empty";

  let hasAmber = false;

  for (const ing of ingredients) {
    // No supplier
    if (!ing.supplier_id) return "red";
    // Supplier not approved
    if (ing.supplier_approved === false) return "red";

    // COA status
    const coa = getCoaStatus(ing.coa_document_id, ing.coa_expiry_date);
    if (coa === "expired" || coa === "missing") return "red";
    if (coa === "expiring") hasAmber = true;

    // Supplier review overdue or due soon — derive from supplier data if available
    // (review_date passed in via IngredientWithSupplier doesn't include supplier review_date
    //  so we check ingredient review_due_at here)
    if (ing.review_due_at) {
      const diff = Math.ceil((new Date(ing.review_due_at).getTime() - Date.now()) / 86_400_000);
      if (diff <= 30) hasAmber = true;
    }
  }

  return hasAmber ? "amber" : "green";
}

// Also export a version that takes full Supplier objects for the supplier-review check
export function computeHealthWithSuppliers(
  ingredients: IngredientWithSupplier[],
  suppliers:   Supplier[],
): HealthStatus {
  const base = computeHealth(ingredients);
  if (base === "red") return "red";

  const supplierMap = new Map(suppliers.map((s) => [s.id, s]));
  for (const ing of ingredients) {
    if (!ing.supplier_id) continue;
    const supplier = supplierMap.get(ing.supplier_id);
    if (!supplier) continue;
    if (supplier.review_date) {
      const diff = Math.ceil((new Date(supplier.review_date).getTime() - Date.now()) / 86_400_000);
      if (diff <= 30) return "amber";
    }
  }

  return base;
}

const CONFIG = {
  green: {
    bg:      "#F0FDF4",
    border:  "#BBF7D0",
    color:   "#15803D",
    icon:    "✅",
    message: "Supply chain healthy — all ingredients linked to approved suppliers with valid COAs.",
  },
  amber: {
    bg:      "#FFFBEB",
    border:  "#FDE68A",
    color:   "#92400E",
    icon:    "⚠️",
    message: "Some items need attention — supplier review dates or COA expiries are approaching.",
  },
  red: {
    bg:      "#FEF2F2",
    border:  "#FECACA",
    color:   "#991B1B",
    icon:    "🚨",
    message: "Action required — missing or unapproved suppliers, or expired/missing COAs.",
  },
  empty: {
    bg:      "#F8FAFC",
    border:  "#E2E8F0",
    color:   "#64748B",
    icon:    "📦",
    message: "No ingredients in the active formula yet.",
  },
};

interface SupplyChainHealthProps {
  status: HealthStatus;
}

export default function SupplyChainHealth({ status }: SupplyChainHealthProps) {
  const conf = CONFIG[status];

  return (
    <div
      style={{
        margin:          "12px 16px",
        backgroundColor: conf.bg,
        border:          `1px solid ${conf.border}`,
        borderRadius:    10,
        padding:         "10px 12px",
        display:         "flex",
        alignItems:      "flex-start",
        gap:             8,
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>{conf.icon}</span>
      <p
        style={{
          margin:     0,
          fontSize:   13,
          color:      conf.color,
          fontFamily: "var(--font-body), DM Sans, sans-serif",
          lineHeight: 1.5,
          fontWeight: 500,
        }}
      >
        {conf.message}
      </p>
    </div>
  );
}

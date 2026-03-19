"use client";

import type { IngredientWithSupplier } from "@/app/api/ingredients/route";

// EU 14 allergen display map
const ALLERGEN_LABELS: Record<string, { short: string; bg: string; color: string }> = {
  GLUTEN:     { short: "Gluten",      bg: "#FEF3C7", color: "#92400E" },
  CRUSTACEAN: { short: "Crustacean",  bg: "#FEF3C7", color: "#92400E" },
  EGG:        { short: "Egg",         bg: "#FEF3C7", color: "#92400E" },
  FISH:       { short: "Fish",        bg: "#FEF3C7", color: "#92400E" },
  PEANUT:     { short: "Peanut",      bg: "#FEF3C7", color: "#92400E" },
  SOYA:       { short: "Soya",        bg: "#FEF3C7", color: "#92400E" },
  MILK:       { short: "Milk",        bg: "#FEF3C7", color: "#92400E" },
  NUTS:       { short: "Nuts",        bg: "#FEF3C7", color: "#92400E" },
  CELERY:     { short: "Celery",      bg: "#FEF3C7", color: "#92400E" },
  MUSTARD:    { short: "Mustard",     bg: "#FEF3C7", color: "#92400E" },
  SESAME:     { short: "Sesame",      bg: "#FEF3C7", color: "#92400E" },
  SULPHITE:   { short: "Sulphites",   bg: "#FEF3C7", color: "#92400E" },
  LUPIN:      { short: "Lupin",       bg: "#FEF3C7", color: "#92400E" },
  MOLLUSC:    { short: "Molluscs",    bg: "#FEF3C7", color: "#92400E" },
};

export type CoaStatus = "ok" | "expiring" | "expired" | "missing";

export function getCoaStatus(
  coaDocumentId: string | null,
  coaExpiryDate: string | null,
): CoaStatus {
  if (!coaDocumentId) return "missing";
  if (!coaExpiryDate) return "ok"; // document exists, no expiry set = ok
  const diff = Math.ceil((new Date(coaExpiryDate).getTime() - Date.now()) / 86_400_000);
  if (diff < 0)   return "expired";
  if (diff <= 30) return "expiring";
  return "ok";
}

const COA_STATUS_CONFIG: Record<CoaStatus, { label: string; bg: string; color: string }> = {
  ok:       { label: "COA valid",     bg: "#F0FDF4", color: "#16A34A" },
  expiring: { label: "COA expiring",  bg: "#FFFBEB", color: "#D97706" },
  expired:  { label: "COA expired",   bg: "#FEF2F2", color: "#DC2626" },
  missing:  { label: "No COA",        bg: "#F1F5F9", color: "#94A3B8" },
};

interface IngredientRowProps {
  ingredient: IngredientWithSupplier;
  onClick:    (ingredient: IngredientWithSupplier) => void;
}

export default function IngredientRow({ ingredient, onClick }: IngredientRowProps) {
  const coaStatus = getCoaStatus(ingredient.coa_document_id, ingredient.coa_expiry_date);
  const coaConf   = COA_STATUS_CONFIG[coaStatus];
  const hasSupplier = !!ingredient.supplier_id;

  return (
    <button
      onClick={() => onClick(ingredient)}
      style={{
        width:           "100%",
        backgroundColor: "white",
        borderBottom:    "1px solid #E2E8F0",
        padding:         "12px 16px",
        border:          "none",
        borderBottom:    "1px solid #E2E8F0",
        textAlign:       "left",
        cursor:          "pointer",
      }}
    >
      {/* Name row */}
      <p
        style={{
          margin:       "0 0 4px",
          fontSize:     14,
          fontWeight:   600,
          color:        "#1E293B",
          fontFamily:   "var(--font-body), DM Sans, sans-serif",
          overflow:     "hidden",
          textOverflow: "ellipsis",
          whiteSpace:   "nowrap",
        }}
      >
        {ingredient.name}
      </p>

      {/* Supplier row */}
      <p
        style={{
          margin:       "0 0 6px",
          fontSize:     12,
          color:        hasSupplier ? "#475569" : "#D97706",
          fontFamily:   "var(--font-body), DM Sans, sans-serif",
          display:      "flex",
          alignItems:   "center",
          gap:          4,
        }}
      >
        {hasSupplier ? (
          <>
            {ingredient.supplier_name}
            {ingredient.supplier_country && (
              <span style={{ color: "#94A3B8" }}>· {ingredient.supplier_country}</span>
            )}
            {ingredient.supplier_approved === false && (
              <span
                style={{
                  fontSize:        10,
                  fontWeight:      700,
                  textTransform:   "uppercase",
                  padding:         "1px 5px",
                  borderRadius:    3,
                  backgroundColor: "#FEF2F2",
                  color:           "#DC2626",
                  marginLeft:      4,
                }}
              >
                Not approved
              </span>
            )}
          </>
        ) : (
          "⚠ No supplier linked"
        )}
      </p>

      {/* Tags row */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {/* COA status */}
        <span
          style={{
            fontSize:        10,
            fontWeight:      600,
            textTransform:   "uppercase",
            letterSpacing:   "0.04em",
            padding:         "2px 6px",
            borderRadius:    4,
            backgroundColor: coaConf.bg,
            color:           coaConf.color,
            fontFamily:      "var(--font-body), DM Sans, sans-serif",
          }}
        >
          {coaConf.label}
        </span>

        {/* Allergen tags */}
        {ingredient.allergen_codes.slice(0, 3).map((code) => {
          const a = ALLERGEN_LABELS[code.toUpperCase()];
          return (
            <span
              key={code}
              style={{
                fontSize:        10,
                fontWeight:      600,
                padding:         "2px 6px",
                borderRadius:    4,
                backgroundColor: a?.bg ?? "#FEF3C7",
                color:           a?.color ?? "#92400E",
                fontFamily:      "var(--font-body), DM Sans, sans-serif",
              }}
            >
              {a?.short ?? code}
            </span>
          );
        })}
        {ingredient.allergen_codes.length > 3 && (
          <span style={{ fontSize: 10, color: "#94A3B8", fontFamily: "var(--font-body), DM Sans, sans-serif", padding: "2px 4px" }}>
            +{ingredient.allergen_codes.length - 3}
          </span>
        )}

        {/* Organic badge */}
        {ingredient.is_organic && (
          <span
            style={{
              fontSize:        10,
              fontWeight:      600,
              padding:         "2px 6px",
              borderRadius:    4,
              backgroundColor: "#DCFCE7",
              color:           "#15803D",
              fontFamily:      "var(--font-body), DM Sans, sans-serif",
            }}
          >
            Organic
          </span>
        )}
      </div>
    </button>
  );
}

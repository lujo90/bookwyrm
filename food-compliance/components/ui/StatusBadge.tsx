interface StatusBadgeProps {
  /** Any product status string: draft | in_review | approved | archived */
  status: string;
}

interface BadgeVariant {
  label: string;
  color: string;
  background: string;
}

const VARIANTS: Record<string, BadgeVariant> = {
  draft:     { label: "Draft",     color: "#64748B", background: "#F1F5F9" },
  in_review: { label: "In Review", color: "#2563EB", background: "#EFF6FF" },
  approved:  { label: "Approved",  color: "#16A34A", background: "#F0FDF4" },
  archived:  { label: "Archived",  color: "#94A3B8", background: "#F8FAFC" },
};

/**
 * StatusBadge
 *
 * Pill badge showing the status of a product.
 * Accepts a plain string so it works before the DB type is imported.
 *
 * Spec: 10px DM Sans 700, uppercase, padding 3px 10px, border-radius 20px.
 */
export default function StatusBadge({ status }: StatusBadgeProps) {
  const variant = VARIANTS[status] ?? {
    label:      status,
    color:      "#64748B",
    background: "#F1F5F9",
  };

  return (
    <span
      style={{
        display:        "inline-flex",
        alignItems:     "center",
        padding:        "3px 10px",
        borderRadius:   20,
        fontSize:       10,
        fontWeight:     700,
        textTransform:  "uppercase",
        letterSpacing:  "0.06em",
        lineHeight:     1.4,
        color:          variant.color,
        backgroundColor: variant.background,
        fontFamily:     "var(--font-body), DM Sans, sans-serif",
        whiteSpace:     "nowrap",
      }}
    >
      {variant.label}
    </span>
  );
}

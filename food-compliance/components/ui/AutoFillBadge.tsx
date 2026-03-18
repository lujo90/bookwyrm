interface AutoFillBadgeProps {
  /** Where the value was sourced from, e.g. "your organisation settings" */
  source: string;
}

/**
 * AutoFillBadge
 *
 * Inline indicator that a field was pre-filled automatically.
 * Spec: sparkle + "Auto-filled from [source]", 11px DM Sans italic, #2563EB.
 */
export default function AutoFillBadge({ source }: AutoFillBadgeProps) {
  return (
    <span
      style={{
        fontSize:   11,
        fontStyle:  "italic",
        fontWeight: 400,
        color:      "#2563EB",
        fontFamily: "var(--font-body), DM Sans, sans-serif",
        lineHeight: 1.4,
      }}
    >
      ✨ Auto-filled from {source}
    </span>
  );
}

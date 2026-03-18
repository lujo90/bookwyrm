import type { ProductStatus } from "@/types/database";

interface StatusBadgeProps {
  status: ProductStatus;
}

const VARIANT_MAP: Record<
  ProductStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-600",
  },
  in_review: {
    label: "In Review",
    className: "bg-blue-100 text-primary",
  },
  approved: {
    label: "Approved",
    className: "bg-green-100 text-success",
  },
  archived: {
    label: "Archived",
    className: "bg-slate-100 text-slate-400",
  },
};

/**
 * StatusBadge
 *
 * A small pill that shows the current status of a product.
 * Uses your custom colour palette from tailwind.config.ts.
 */
export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = VARIANT_MAP[status];

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        className,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

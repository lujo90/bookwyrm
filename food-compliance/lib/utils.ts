import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn — merge Tailwind class names safely.
 *
 * Combines clsx (conditional classes) with tailwind-merge (deduplication).
 * Used by all shadcn/ui components.
 *
 * Example:
 *   cn("px-4 py-2", isActive && "bg-primary", "px-6")
 *   → "py-2 bg-primary px-6"  (px-4 is overridden by px-6)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

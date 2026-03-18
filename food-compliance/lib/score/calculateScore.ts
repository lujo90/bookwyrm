/**
 * calculateScore
 *
 * Single source of truth for compliance score calculation.
 * Pure function — no Supabase dependency. Call this every time any
 * checklist item changes state, then persist the result to the product row.
 */

import type { ChecklistItem, ScoreResult, ScoreBreakdown, ScoreCategoryBreakdown } from "@/types/database";

export type { ScoreResult, ScoreBreakdown };

// ─── Milestone messages ───────────────────────────────────────────────────────

const MILESTONES: Array<{ max: number; message: string }> = [
  { max: 24,  message: "Good start. Your product exists in the system." },
  { max: 49,  message: "Making progress. Your recipe and allergens are confirmed." },
  { max: 74,  message: "Halfway there. Documents are the next big step." },
  { max: 89,  message: "Nearly ready. Review your details and we will check everything." },
  { max: 99,  message: "Almost done. A few final confirmations needed." },
  { max: 100, message: "You are ready to sell. Download your compliance pack." },
];

function getMilestoneMessage(score: number): string {
  const milestone = MILESTONES.find((m) => score <= m.max);
  return milestone?.message ?? MILESTONES[MILESTONES.length - 1].message;
}

// ─── Per-category breakdown ───────────────────────────────────────────────────

function buildCategoryBreakdown(
  items: ChecklistItem[],
): ScoreCategoryBreakdown {
  const total     = items.length;
  const completed = items.filter((i) => i.completed).length;
  const percentage =
    total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percentage };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function calculateScore(items: ChecklistItem[]): ScoreResult {
  // Group items by category
  const byCategory = {
    formula:    items.filter((i) => i.category === "formula"),
    compliance: items.filter((i) => i.category === "compliance"),
    documents:  items.filter((i) => i.category === "documents"),
    packaging:  items.filter((i) => i.category === "packaging"),
    suppliers:  items.filter((i) => i.category === "suppliers"),
  };

  const breakdown: ScoreBreakdown = {
    formula:    buildCategoryBreakdown(byCategory.formula),
    compliance: buildCategoryBreakdown(byCategory.compliance),
    documents:  buildCategoryBreakdown(byCategory.documents),
    packaging:  buildCategoryBreakdown(byCategory.packaging),
    suppliers:  buildCategoryBreakdown(byCategory.suppliers),
  };

  // Weighted score: sum of completed item weights / sum of all item weights
  const sumAll       = items.reduce((acc, i) => acc + i.weight, 0);
  const sumCompleted = items
    .filter((i) => i.completed)
    .reduce((acc, i) => acc + i.weight, 0);

  const total =
    sumAll === 0 ? 0 : Math.round((sumCompleted / sumAll) * 100);

  const blockingIncomplete = items
    .filter((i) => i.blocking && !i.completed)
    .map((i) => i.title);

  return {
    total,
    breakdown,
    blockingIncomplete,
    milestoneMessage: getMilestoneMessage(total),
  };
}

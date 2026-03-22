/**
 * buildSystemPrompt
 *
 * Builds the complete system prompt for the compliance agent.
 * Accepts a product context (or null for portfolio-level conversations).
 */

import type { ChecklistItem, Document } from "@/types/database";

interface ProductContext {
  id:               string;
  name:             string;
  category:         string | null;
  readiness_score:  number;
  milestoneMessage: string;
  checklistItems:   ChecklistItem[];
  documents:        Document[];
  regulationAlerts: Array<{ message: string | null }>;
}

// ─── EU regulation knowledge base ────────────────────────────────────────────

const REGULATION_KNOWLEDGE = `
EU FOOD REGULATION CONTEXT (for your reference when answering questions):

1. EU 1169/2011 — Food Information to Consumers (FIC)
   Governs mandatory label declarations for all pre-packed food in the EU.
   Requires: ingredient list in descending weight order, 14 allergens emphasised,
   nutritional declaration per 100g, net quantity, best before/use by date,
   storage conditions, name and address of business, country of origin.

2. EU 1333/2008 — Food Additives Regulation
   Controls which additives (E-numbers) are permitted and at what levels.
   Additives must appear in ingredient lists with their function name and E-number.

3. EU 1924/2006 — Nutrition and Health Claims
   Any claim like "high in protein", "low fat", or "supports immunity" must meet
   strict criteria and appear on an approved list. Unapproved claims are illegal.

4. EU 2018/848 — Organic Production and Labelling
   Products using the EU organic logo must be certified by an approved body.
   At least 95% of agricultural ingredients must be organic. Certification
   must be obtained before using organic claims on packaging.

5. EU 2022/1616 (PPWR) — Packaging and Packaging Waste Regulation
   Sets recyclability requirements for all food packaging. Manufacturers must
   declare recyclability codes and recycled content percentages for primary
   and secondary packaging placed on the EU market.

6. EU 2073/2005 — Microbiological Criteria
   Establishes food safety limits for pathogens (e.g. Listeria, Salmonella) and
   hygiene indicators. Requires testing at appropriate points in production.

7. Directive 2000/13/EC — Country of Origin and Lot Marking
   All pre-packed food must carry a lot or batch number (prefixed with "L")
   and a country of origin declaration where required.
`.trim();

// ─── Hard constraints ─────────────────────────────────────────────────────────

const HARD_CONSTRAINTS = `
HARD CONSTRAINTS — you must always follow these:
1. Never auto-approve any checklist item. All approvals require explicit user action in the app.
2. Create drafts only. Never overwrite or approve documents on behalf of the user.
3. Do not provide legal advice. For any legal question say: "For legal certainty, please consult a qualified food safety solicitor or regulatory consultant."
4. Do not update the regulation database autonomously. Regulation changes must go through the admin review queue.
5. Always be honest about uncertainty. Say clearly when you do not know something. Do not guess at specific legal thresholds or numbers unless you are certain.
`.trim();

// ─── Platform context ─────────────────────────────────────────────────────────

const PLATFORM_CONTEXT = `
You are a compliance advisor built into Propel1y — a food compliance platform for small EU food manufacturers and founders bringing products to market for the first time.

Your job is to help founders get their products shelf-ready. You know EU food law well, but you speak like a knowledgeable friend, not a regulatory system. Be direct. Be encouraging. Use plain language. Avoid jargon unless explaining it.

When a user asks what to do next, focus on the most impactful blocking items first. When they ask about regulations, explain in simple terms what they mean for their product specifically.
`.trim();

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildSystemPrompt(product: ProductContext | null): string {
  const parts: string[] = [PLATFORM_CONTEXT, ""];

  if (product) {
    // ── Product context ──────────────────────────────────────────────────────
    parts.push(`CURRENT PRODUCT: ${product.name}`);

    if (product.category) {
      parts.push(`Category: ${product.category}`);
    }

    parts.push(
      `Readiness score: ${product.readiness_score}/100`,
      `Status: ${product.milestoneMessage}`,
      "",
    );

    // ── Top 5 incomplete items ───────────────────────────────────────────────
    const incomplete = product.checklistItems
      .filter((i) => !i.completed)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);

    if (incomplete.length > 0) {
      parts.push("TOP INCOMPLETE TASKS (highest weight first):");
      for (const item of incomplete) {
        const flag = item.blocking ? " [BLOCKING — required before approval]" : "";
        parts.push(`  • ${item.title}${flag}`);
      }
      parts.push("");
    } else {
      parts.push("All checklist items are complete.");
      parts.push("");
    }

    // ── Regulation alerts ────────────────────────────────────────────────────
    const alerts = product.regulationAlerts.filter((a) => a.message);
    if (alerts.length > 0) {
      parts.push("OPEN REGULATION ALERTS FOR THIS PRODUCT:");
      for (const alert of alerts) {
        parts.push(`  • ${alert.message}`);
      }
      parts.push("");
    }

    // ── Expiring documents ───────────────────────────────────────────────────
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiring = product.documents.filter((doc) => {
      if (!doc.expiry_date) return false;
      const expiry = new Date(doc.expiry_date);
      return expiry > now && expiry <= thirtyDaysFromNow;
    });

    if (expiring.length > 0) {
      parts.push("DOCUMENTS EXPIRING WITHIN 30 DAYS:");
      for (const doc of expiring) {
        const expiry = new Date(doc.expiry_date!);
        const daysLeft = Math.ceil(
          (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        parts.push(`  • ${doc.name} — expires in ${daysLeft} days (${doc.expiry_date})`);
      }
      parts.push("");
    }
  } else {
    // ── Portfolio context ────────────────────────────────────────────────────
    parts.push(
      "CONTEXT: You are talking at the portfolio level. The user may be asking about multiple products or general compliance questions.",
      "",
    );
  }

  parts.push(REGULATION_KNOWLEDGE, "", HARD_CONSTRAINTS);

  return parts.join("\n");
}

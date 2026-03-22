/**
 * onDemandPrompts
 *
 * Pre-written prompts sent as user messages when quick action buttons are tapped
 * in the AgentSidebar. Each constant is a complete, self-contained question
 * that works with the product context injected via the system prompt.
 */

// ─── Quick action prompts ─────────────────────────────────────────────────────

export const WHAT_IS_BLOCKING =
  "List every blocking item that is preventing this product from reaching 100%. For each one, explain in plain English what I need to do, why it is required by EU regulations, and how long it typically takes to complete.";

export const DRAFT_ALLERGEN_STATEMENT =
  "Draft a complete allergen statement for this product based on the formula data. It must comply with EU 1169/2011 Annex II. Format it ready to appear on the product label. Include both contains and may contain sections. Keep it concise and legally accurate.";

export const CHECK_MY_LABEL =
  "Based on this product data, list every mandatory element that must appear on the label under EU FIC (EU 1169/2011 Article 9). For each element tell me: whether it is confirmed present in my current label artwork, unconfirmed, or missing. Flag any issues that would prevent retail listing.";

export const DRAFT_PRODUCT_SPEC =
  "Draft a complete product specification document for this product using all available data. Include: product overview, formula summary without ingredient percentages, nutritional information per 100g in EU FIC format, full allergen declaration, packaging description, shelf life, storage conditions, and any applicable certifications. Format it professionally.";

// ─── More actions ─────────────────────────────────────────────────────────────

export const DRAFT_HACCP_SUMMARY =
  "Draft a HACCP plan summary for this product. Include the standard sections: product description, intended use, process flow overview, hazard analysis table with biological/chemical/physical hazards, critical control points, monitoring procedures, corrective actions, and record keeping. Mark clearly where I need to fill in production-specific details.";

export const TRACEABILITY_REPORT =
  "Generate a traceability report for this product. List all ingredients with their supplier names and countries, current COA status and expiry dates, and any certification statuses. Format it as a clear table suitable for sharing with a retailer or auditor.";

// ─── Dynamic prompts ──────────────────────────────────────────────────────────

/**
 * Returns a prompt asking the agent to explain a specific regulation code
 * in plain English, relating it to the current product's tasks.
 */
export function EXPLAIN_REGULATION(code: string): string {
  return (
    `Explain ${code} in plain English. What does it require? Which of my current tasks does it relate to? ` +
    `What are the consequences of non-compliance? Give me a practical summary I can act on.`
  );
}

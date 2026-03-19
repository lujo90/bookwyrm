/**
 * Change Management Cascade Handler — Phase 10
 *
 * Six exported async functions that implement cascade logic triggered when
 * formula or document changes occur. Each function:
 *   1. Identifies affected checklist items via partial title match
 *   2. Resets completed items back to incomplete
 *   3. Recalculates the product's readiness score
 *   4. Writes audit_log entries for every reset
 *   5. Returns a CascadeResult (reset titles + notification strings)
 *
 * All functions accept an injected Supabase client (typed `any` to avoid
 * Supabase generic inference issues — same pattern as supply-chain/cascade.ts).
 */

import { calculateScore } from "@/lib/score/calculateScore";
import type { ChecklistItem, ScoreResult, ScoreBreakdown } from "@/types/database";

type AnyClient = any;

// ─── Return type ──────────────────────────────────────────────────────────────

export interface CascadeResult {
  itemsReset:    string[];        // titles of checklist items that were reset
  notifications: string[];        // human-readable sentences for ChangeAlert
  score:         ScoreResult | null;
}

const EMPTY: CascadeResult = { itemsReset: [], notifications: [], score: null };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Reset a checklist item to incomplete and persist. Mutates `item` in place. */
async function resetItem(
  item:        ChecklistItem,
  db:          AnyClient,
  productId:   string,
  orgId:       string,
  actorId:     string,
  actorEmail:  string,
  actionType:  string,
  description: string,
): Promise<void> {
  await db
    .from("checklist_items")
    .update({ completed: false, completed_at: null, completed_by: null })
    .eq("id", item.id);

  item.completed    = false;
  item.completed_at = null;
  item.completed_by = null;

  await db.from("audit_log").insert({
    organisation_id: orgId,
    product_id:      productId,
    actor_id:        actorId,
    actor_email:     actorEmail,
    action_type:     actionType,
    description,
    resource_type:   "checklist_item",
    resource_id:     item.id,
    metadata:        { item_title: item.title, cascade: true },
  });
}

/** Persist the updated score to the products table. */
async function persistScore(
  productId: string,
  allItems:  ChecklistItem[],
  db:        AnyClient,
): Promise<ScoreResult> {
  const result = calculateScore(allItems);
  await db
    .from("products")
    .update({
      readiness_score:     result.total,
      readiness_breakdown: result.breakdown as ScoreBreakdown,
    })
    .eq("id", productId);
  return result;
}

/** Fetch all checklist items for a product. */
async function fetchItems(productId: string, db: AnyClient): Promise<ChecklistItem[]> {
  const { data } = await db
    .from("checklist_items")
    .select("*")
    .eq("product_id", productId);
  return (data ?? []) as ChecklistItem[];
}

/** Fetch the organisation_id for a product (used in audit_log). */
async function fetchOrgId(productId: string, db: AnyClient): Promise<string | null> {
  const { data } = await db
    .from("products")
    .select("organisation_id")
    .eq("id", productId)
    .single();
  return (data as { organisation_id: string } | null)?.organisation_id ?? null;
}

// ─── onIngredientAdded ────────────────────────────────────────────────────────

/**
 * Called after an ingredient is added to the active formula.
 * If the ingredient introduces new allergen codes, resets allergen
 * confirmation checklist items.
 */
export async function onIngredientAdded(
  productId:    string,
  ingredient:   { name: string; allergen_codes: string[]; formula_id: string },
  db:           AnyClient,
  actorEmail:   string,
  actorId:      string,
): Promise<CascadeResult> {
  if (!ingredient.allergen_codes.length) return EMPTY;

  const orgId = await fetchOrgId(productId, db);
  if (!orgId) return EMPTY;

  // Existing allergen union from all OTHER ingredients in the formula
  const { data: othersRaw } = await db
    .from("ingredients")
    .select("allergen_codes")
    .eq("formula_id", ingredient.formula_id)
    .neq("name", ingredient.name);  // exclude just-added by name (id not yet known)

  const existingCodes = new Set<string>(
    ((othersRaw ?? []) as { allergen_codes: string[] }[])
      .flatMap((i) => i.allergen_codes),
  );

  const newCodes = ingredient.allergen_codes.filter((c) => !existingCodes.has(c));
  if (!newCodes.length) return EMPTY;  // no NEW allergens introduced

  const allItems = await fetchItems(productId, db);
  const resetTitles: string[] = [];

  const targets = allItems.filter(
    (i) =>
      i.completed &&
      ((i.category === "formula"     && i.title.toLowerCase().includes("allergen")) ||
       (i.category === "compliance"  && i.title.toLowerCase().includes("allergen declaration"))),
  );

  for (const item of targets) {
    await resetItem(
      item, db, productId, orgId, actorId, actorEmail,
      "ingredient_added_cascade",
      `"${item.title}" reset — new allergen codes introduced by ingredient "${ingredient.name}"`,
    );
    resetTitles.push(item.title);
  }

  if (!resetTitles.length) return EMPTY;

  const score = await persistScore(productId, allItems, db);
  return {
    itemsReset:    resetTitles,
    notifications: [
      `You added "${ingredient.name}". Please confirm your allergen declaration is still accurate.`,
    ],
    score,
  };
}

// ─── onIngredientRemoved ──────────────────────────────────────────────────────

/**
 * Called after an ingredient is removed from the active formula.
 * If the allergen set has changed, resets allergen confirmation items.
 */
export async function onIngredientRemoved(
  productId:   string,
  ingredient:  { name: string; allergen_codes: string[]; formula_id: string },
  db:          AnyClient,
  actorEmail:  string,
  actorId:     string,
): Promise<CascadeResult> {
  if (!ingredient.allergen_codes.length) return EMPTY;

  const orgId = await fetchOrgId(productId, db);
  if (!orgId) return EMPTY;

  // Remaining allergen union after removal
  const { data: remainingRaw } = await db
    .from("ingredients")
    .select("allergen_codes")
    .eq("formula_id", ingredient.formula_id);

  const remainingCodes = new Set<string>(
    ((remainingRaw ?? []) as { allergen_codes: string[] }[])
      .flatMap((i) => i.allergen_codes),
  );

  // If removed ingredient had codes that no longer appear, allergen set changed
  const lostCodes = ingredient.allergen_codes.filter((c) => !remainingCodes.has(c));
  if (!lostCodes.length) return EMPTY;

  const allItems = await fetchItems(productId, db);
  const resetTitles: string[] = [];

  const targets = allItems.filter(
    (i) =>
      i.completed &&
      ((i.category === "formula"    && i.title.toLowerCase().includes("allergen")) ||
       (i.category === "compliance" && i.title.toLowerCase().includes("allergen declaration"))),
  );

  for (const item of targets) {
    await resetItem(
      item, db, productId, orgId, actorId, actorEmail,
      "ingredient_removed_cascade",
      `"${item.title}" reset — allergen set changed after removing "${ingredient.name}"`,
    );
    resetTitles.push(item.title);
  }

  if (!resetTitles.length) return EMPTY;

  const score = await persistScore(productId, allItems, db);
  return {
    itemsReset:    resetTitles,
    notifications: [
      `"${ingredient.name}" removed. Allergen declaration has been reset for review.`,
    ],
    score,
  };
}

// ─── onNutritionalDataChanged ─────────────────────────────────────────────────

/**
 * Called after nutritional values are saved to the active formula.
 * If the formula is locked, also resets the "Enter nutritional values" item.
 * Always resets the "nutritional declaration on label" compliance item.
 */
export async function onNutritionalDataChanged(
  productId:       string,
  formulaIsLocked: boolean,
  db:              AnyClient,
  actorEmail:      string,
  actorId:         string,
): Promise<CascadeResult> {
  const orgId = await fetchOrgId(productId, db);
  if (!orgId) return EMPTY;

  const allItems = await fetchItems(productId, db);
  const resetTitles: string[] = [];

  const targets = allItems.filter((i) => {
    if (!i.completed) return false;
    const t = i.title.toLowerCase();
    if (formulaIsLocked &&
        i.category === "formula" &&
        (t.includes("nutritional value") || t.includes("enter nutritional"))) return true;
    if (i.category === "compliance" && t.includes("nutritional declaration")) return true;
    return false;
  });

  for (const item of targets) {
    await resetItem(
      item, db, productId, orgId, actorId, actorEmail,
      "nutritional_data_cascade",
      `"${item.title}" reset — nutritional data was changed`,
    );
    resetTitles.push(item.title);
  }

  if (!resetTitles.length) return EMPTY;

  const score = await persistScore(productId, allItems, db);
  return {
    itemsReset:    resetTitles,
    notifications: ["Nutritional data changed. Please re-verify your label."],
    score,
  };
}

// ─── onFormulaVersionCreated ──────────────────────────────────────────────────

/**
 * Called after a new formula version is created.
 * Resets label, allergen declaration, nutritional declaration, and EU FIC items.
 */
export async function onFormulaVersionCreated(
  productId:  string,
  oldVersion: number,
  newVersion: number,
  db:         AnyClient,
  actorEmail: string,
  actorId:    string,
): Promise<CascadeResult> {
  const orgId = await fetchOrgId(productId, db);
  if (!orgId) return EMPTY;

  const allItems = await fetchItems(productId, db);
  const resetTitles: string[] = [];

  const targets = allItems.filter((i) => {
    if (!i.completed) return false;
    const t = i.title.toLowerCase();
    if (i.category === "documents"  && t.includes("label artwork"))                    return true;
    if (i.category === "compliance" && t.includes("allergen declaration on label"))    return true;
    if (i.category === "compliance" && t.includes("nutritional declaration on label")) return true;
    if (i.category === "compliance" && (t.includes("fic") || t.includes("label format"))) return true;
    return false;
  });

  for (const item of targets) {
    await resetItem(
      item, db, productId, orgId, actorId, actorEmail,
      "formula_version_cascade",
      `"${item.title}" reset — formula version changed from v${oldVersion} to v${newVersion}`,
    );
    resetTitles.push(item.title);
  }

  if (!resetTitles.length) return EMPTY;

  const score = await persistScore(productId, allItems, db);

  const listStr = resetTitles.map((t) => `"${t}"`).join(", ");
  return {
    itemsReset:    resetTitles,
    notifications: [
      `Formula v${newVersion} created. ${resetTitles.length} item(s) reset: ${listStr}.`,
    ],
    score,
  };
}

// ─── onDocumentExpired ────────────────────────────────────────────────────────

/**
 * Called for a document whose expiry_date is in the past.
 * Resets any checklist item that references this document as evidence.
 */
export async function onDocumentExpired(
  documentId: string,
  db:         AnyClient,
): Promise<CascadeResult> {
  // Fetch the document to get product_id and name
  const { data: docRaw } = await db
    .from("documents")
    .select("id, product_id, name, type")
    .eq("id", documentId)
    .single();

  const doc = docRaw as { id: string; product_id: string; name: string; type: string } | null;
  if (!doc) return EMPTY;

  const productId = doc.product_id;
  const orgId     = await fetchOrgId(productId, db);
  if (!orgId) return EMPTY;

  const allItems = await fetchItems(productId, db);

  // Only target items that explicitly link this document as evidence
  const targets = allItems.filter(
    (i) => i.completed && i.evidence_document_id === documentId,
  );

  if (!targets.length) return EMPTY;

  const resetTitles: string[] = [];
  for (const item of targets) {
    await resetItem(
      item, db, productId, orgId, "system", "system@foodcompliance.app",
      "document_expired_checklist_reset",
      `"${item.title}" reset — linked document "${doc.name}" has expired`,
    );
    resetTitles.push(item.title);
  }

  const score = await persistScore(productId, allItems, db);
  return {
    itemsReset:    resetTitles,
    notifications: [
      `Document "${doc.name}" has expired. ${resetTitles.length} checklist item(s) reset.`,
    ],
    score,
  };
}

// ─── onDocumentVersionUploaded ────────────────────────────────────────────────

/**
 * Called when a new document is uploaded for a type that already had
 * a document for this product. Resets the matching documents-category
 * checklist item to signal it needs re-review.
 *
 * documentType → partial title match map:
 *   spec_sheet   → "spec sheet"
 *   lab_report   → "lab report"
 *   certificate  → "certificate"
 *   declaration  → "declaration"
 *   label_artwork → "label artwork"
 *   other        → (no reset)
 */
const DOC_TYPE_TITLE_MAP: Record<string, string> = {
  spec_sheet:    "spec sheet",
  lab_report:    "lab report",
  certificate:   "certificate",
  declaration:   "declaration",
  label_artwork: "label artwork",
};

export async function onDocumentVersionUploaded(
  productId:    string,
  documentType: string,
  db:           AnyClient,
  actorEmail:   string,
  actorId:      string,
): Promise<CascadeResult> {
  const titleMatch = DOC_TYPE_TITLE_MAP[documentType];
  if (!titleMatch) return EMPTY;

  const orgId = await fetchOrgId(productId, db);
  if (!orgId) return EMPTY;

  const allItems = await fetchItems(productId, db);
  const resetTitles: string[] = [];

  const targets = allItems.filter(
    (i) =>
      i.completed &&
      i.category === "documents" &&
      i.title.toLowerCase().includes(titleMatch),
  );

  for (const item of targets) {
    await resetItem(
      item, db, productId, orgId, actorId, actorEmail,
      "document_version_cascade",
      `"${item.title}" reset — new ${documentType.replace("_", " ")} uploaded`,
    );
    resetTitles.push(item.title);
  }

  if (!resetTitles.length) return EMPTY;

  const score = await persistScore(productId, allItems, db);
  const typeName = documentType.replace("_", " ");
  return {
    itemsReset:    resetTitles,
    notifications: [
      `A new ${typeName} was uploaded. The linked checklist item has been reset for re-review.`,
    ],
    score,
  };
}

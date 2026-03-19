/**
 * Supply chain cascade logic.
 *
 * When a supplier's approval is revoked, this function:
 *  1. Finds all ingredients that reference the supplier.
 *  2. Finds all formulas (and their products) that contain those ingredients.
 *  3. Resets the "Link all ingredients to approved suppliers" checklist item
 *     on each affected product to incomplete.
 *  4. Recalculates and persists each product's readiness score.
 *  5. Writes a supply_chain_events row.
 *  6. Writes audit_log entries for every affected product.
 *  7. Returns a summary of the cascade impact.
 *
 * The Supabase client is injected so this can be called from any route
 * handler without creating an additional connection.
 */

import { calculateScore } from "@/lib/score/calculateScore";
import type { ChecklistItem } from "@/types/database";

// The exact checklist item title targeted by the cascade.
// Must match the seed data / checklist generation logic.
const SUPPLIER_CHECKLIST_TITLE = "Link all ingredients to approved suppliers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export interface CascadeResult {
  affectedIngredients: number;
  affectedProducts:    number;
  itemsReset:          number;
}

export async function handleSupplierRevoked(
  supplierId:     string,
  organisationId: string,
  db:             AnyClient,
  actorEmail:     string,
  actorId:        string,
): Promise<CascadeResult> {

  // ── 1. Ingredients that use this supplier ────────────────────────────────────
  const { data: ingredientsRaw } = await db
    .from("ingredients")
    .select("id, formula_id")
    .eq("supplier_id", supplierId);

  const ingredients = (ingredientsRaw ?? []) as { id: string; formula_id: string }[];
  if (ingredients.length === 0) {
    // No ingredients affected — still write a supply chain event
    await db.from("supply_chain_events").insert({
      organisation_id:         organisationId,
      event_type:              "supplier_revoked",
      affected_supplier_id:    supplierId,
      affected_ingredient_ids: [],
      affected_product_ids:    [],
      cascade_items_reset:     0,
      description:             "Supplier approval revoked — no ingredient links found.",
    });
    return { affectedIngredients: 0, affectedProducts: 0, itemsReset: 0 };
  }

  const ingredientIds = ingredients.map((i) => i.id);
  const formulaIds    = [...new Set(ingredients.map((i) => i.formula_id))];

  // ── 2. Products via formulas ──────────────────────────────────────────────────
  const { data: formulasRaw } = await db
    .from("formulas")
    .select("id, product_id")
    .in("id", formulaIds);

  const formulas = (formulasRaw ?? []) as { id: string; product_id: string }[];
  const productIds = [...new Set(formulas.map((f) => f.product_id))];

  if (productIds.length === 0) {
    await db.from("supply_chain_events").insert({
      organisation_id:         organisationId,
      event_type:              "supplier_revoked",
      affected_supplier_id:    supplierId,
      affected_ingredient_ids: ingredientIds,
      affected_product_ids:    [],
      cascade_items_reset:     0,
      description:             `Supplier approval revoked — ${ingredientIds.length} ingredient(s) affected, no products linked yet.`,
    });
    return { affectedIngredients: ingredientIds.length, affectedProducts: 0, itemsReset: 0 };
  }

  // ── 3 + 4. Reset checklist item + recalculate score per product ──────────────
  let itemsReset = 0;

  for (const productId of productIds) {
    // Fetch all checklist items for this product
    const { data: allItemsRaw } = await db
      .from("checklist_items")
      .select("*")
      .eq("product_id", productId);

    const allItems = (allItemsRaw ?? []) as ChecklistItem[];

    // Find the supplier checklist item
    const supplierItem = allItems.find(
      (i) => i.category === "suppliers" &&
             i.title.toLowerCase().includes("approved suppliers"),
    );

    if (supplierItem && supplierItem.completed) {
      // Reset it to incomplete
      await db
        .from("checklist_items")
        .update({
          completed:    false,
          completed_at: null,
          completed_by: null,
        })
        .eq("id", supplierItem.id);

      itemsReset++;

      // Recalculate score with the updated item list
      const updatedItems = allItems.map((i) =>
        i.id === supplierItem.id
          ? { ...i, completed: false, completed_at: null, completed_by: null }
          : i,
      );
      const newScore = calculateScore(updatedItems);

      await db
        .from("products")
        .update({
          readiness_score:     newScore.total,
          readiness_breakdown: newScore.breakdown,
        })
        .eq("id", productId);

      // Audit log for this product
      await db.from("audit_log").insert({
        organisation_id: organisationId,
        product_id:      productId,
        actor_id:        actorId,
        actor_email:     actorEmail,
        action_type:     "supplier_cascade_reset",
        description:     `"${SUPPLIER_CHECKLIST_TITLE}" reset — supplier approval revoked`,
        resource_type:   "checklist_item",
        resource_id:     supplierItem.id,
        metadata:        { supplier_id: supplierId, cascade: true },
      });
    }
  }

  // ── 5. Supply chain event ────────────────────────────────────────────────────
  await db.from("supply_chain_events").insert({
    organisation_id:         organisationId,
    event_type:              "supplier_revoked",
    affected_supplier_id:    supplierId,
    affected_ingredient_ids: ingredientIds,
    affected_product_ids:    productIds,
    cascade_items_reset:     itemsReset,
    description:             `Supplier approval revoked. ${ingredientIds.length} ingredient(s) affected across ${productIds.length} product(s). ${itemsReset} checklist item(s) reset.`,
  });

  return {
    affectedIngredients: ingredientIds.length,
    affectedProducts:    productIds.length,
    itemsReset,
  };
}

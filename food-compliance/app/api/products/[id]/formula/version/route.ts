import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { onFormulaVersionCreated } from "@/lib/changes/cascadeHandler";
import type { Formula } from "@/types/database";

/**
 * POST /api/products/[id]/formula/version
 *
 * Creates a new formula version by cloning the current active formula:
 *   1. Set current active formula is_active = false
 *   2. Insert clone with version + 1, is_active = true
 *   3. Clone all ingredients from the old formula to the new one
 *   4. Trigger onFormulaVersionCreated cascade
 *
 * Returns { formula: newFormula, cascade: CascadeResult }
 */

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // Fetch current active formula
  const { data: currentRaw, error: fetchError } = await db
    .from("formulas")
    .select("*")
    .eq("product_id", params.id)
    .eq("is_active", true)
    .maybeSingle();

  if (fetchError || !currentRaw) {
    return NextResponse.json({ error: "No active formula found for this product" }, { status: 404 });
  }
  const current = currentRaw as Formula;
  const oldVersion = current.version;
  const newVersion = oldVersion + 1;

  // Deactivate the current formula
  await db
    .from("formulas")
    .update({ is_active: false })
    .eq("id", current.id);

  // Clone the formula as a new version
  const { data: newFormulaRaw, error: insertError } = await db
    .from("formulas")
    .insert({
      product_id:           current.product_id,
      organisation_id:      current.organisation_id,
      version:              newVersion,
      is_active:            true,
      is_locked:            false,                   // new version starts unlocked
      net_weight_g:         current.net_weight_g,
      serving_size_g:       current.serving_size_g,
      energy_kcal:          current.energy_kcal,
      fat_g:                current.fat_g,
      saturated_fat_g:      current.saturated_fat_g,
      carbohydrate_g:       current.carbohydrate_g,
      sugars_g:             current.sugars_g,
      fibre_g:              current.fibre_g,
      protein_g:            current.protein_g,
      salt_g:               current.salt_g,
      may_contain_allergens: current.may_contain_allergens,
      storage_conditions:   current.storage_conditions,
      shelf_life_days:      current.shelf_life_days,
      created_by:           user.id,
    })
    .select("*")
    .single();

  if (insertError || !newFormulaRaw) {
    // Revert deactivation on failure
    await db.from("formulas").update({ is_active: true }).eq("id", current.id);
    return NextResponse.json({ error: "Failed to create new formula version" }, { status: 500 });
  }
  const newFormula = newFormulaRaw as Formula;

  // Clone all ingredients from the old formula to the new formula
  const { data: existingIngsRaw } = await db
    .from("ingredients")
    .select("*")
    .eq("formula_id", current.id);

  const existingIngs = (existingIngsRaw ?? []) as any[]; // eslint-disable-line
  if (existingIngs.length > 0) {
    const cloned = existingIngs.map(({ id: _id, created_at: _ca, updated_at: _ua, formula_id: _fi, ...rest }) => ({
      ...rest,
      formula_id: newFormula.id,
    }));
    await db.from("ingredients").insert(cloned);
  }

  // Trigger cascade
  const cascade = await onFormulaVersionCreated(
    params.id,
    oldVersion,
    newVersion,
    db,
    user.email ?? "unknown",
    user.id,
  );

  return NextResponse.json({ formula: newFormula, cascade }, { status: 201 });
}

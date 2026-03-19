import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { onIngredientAdded, onIngredientRemoved } from "@/lib/changes/cascadeHandler";
import type { Ingredient } from "@/types/database";

/**
 * PATCH  /api/products/[id]/formula/ingredients/[ingredientId]
 *   — update ingredient; cascades if allergen_codes changed
 * DELETE /api/products/[id]/formula/ingredients/[ingredientId]
 *   — remove ingredient; triggers onIngredientRemoved cascade
 */

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; ingredientId: string } },
) {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: Partial<{
    name:           string;
    percentage:     number;
    supplier_id:    string | null;
    allergen_codes: string[];
    is_allergen:    boolean;
    e_numbers:      string[];
    is_organic:     boolean;
    origin_country: string | null;
    sort_order:     number;
  }>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Fetch the existing ingredient to detect allergen changes
  const { data: existingRaw, error: fetchError } = await db
    .from("ingredients")
    .select("*")
    .eq("id", params.ingredientId)
    .single();

  if (fetchError || !existingRaw) {
    return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
  }
  const existing = existingRaw as Ingredient;

  const patch: Record<string, unknown> = {};
  if (body.name           !== undefined) patch.name           = body.name.trim();
  if (body.percentage     !== undefined) patch.percentage     = body.percentage;
  if (body.supplier_id    !== undefined) patch.supplier_id    = body.supplier_id;
  if (body.allergen_codes !== undefined) patch.allergen_codes = body.allergen_codes;
  if (body.is_allergen    !== undefined) patch.is_allergen    = body.is_allergen;
  if (body.e_numbers      !== undefined) patch.e_numbers      = body.e_numbers;
  if (body.is_organic     !== undefined) patch.is_organic     = body.is_organic;
  if (body.origin_country !== undefined) patch.origin_country = body.origin_country;
  if (body.sort_order     !== undefined) patch.sort_order     = body.sort_order;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data: updatedRaw, error: updateError } = await db
    .from("ingredients")
    .update(patch)
    .eq("id", params.ingredientId)
    .select("*")
    .single();

  if (updateError || !updatedRaw) {
    return NextResponse.json({ error: "Failed to update ingredient" }, { status: 500 });
  }
  const updated = updatedRaw as Ingredient;

  // Determine allergen cascade direction (if allergen_codes changed)
  let cascade = null;
  if (body.allergen_codes !== undefined) {
    const oldCodes = new Set(existing.allergen_codes);
    const newCodes = new Set(updated.allergen_codes);
    const added    = updated.allergen_codes.filter((c) => !oldCodes.has(c));
    const removed  = existing.allergen_codes.filter((c) => !newCodes.has(c));

    if (added.length > 0) {
      cascade = await onIngredientAdded(
        params.id,
        { name: updated.name, allergen_codes: added, formula_id: updated.formula_id },
        db, user.email ?? "unknown", user.id,
      );
    } else if (removed.length > 0) {
      cascade = await onIngredientRemoved(
        params.id,
        { name: updated.name, allergen_codes: removed, formula_id: updated.formula_id },
        db, user.email ?? "unknown", user.id,
      );
    }
  }

  return NextResponse.json({ ingredient: updated, cascade });
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; ingredientId: string } },
) {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // Fetch before deleting so we can cascade
  const { data: ingredientRaw } = await db
    .from("ingredients")
    .select("*")
    .eq("id", params.ingredientId)
    .single();

  if (!ingredientRaw) {
    return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
  }
  const ingredient = ingredientRaw as Ingredient;

  const { error } = await db
    .from("ingredients")
    .delete()
    .eq("id", params.ingredientId);

  if (error) return NextResponse.json({ error: "Failed to delete ingredient" }, { status: 500 });

  const cascade = await onIngredientRemoved(
    params.id,
    { name: ingredient.name, allergen_codes: ingredient.allergen_codes, formula_id: ingredient.formula_id },
    db,
    user.email ?? "unknown",
    user.id,
  );

  return NextResponse.json({ success: true, cascade });
}

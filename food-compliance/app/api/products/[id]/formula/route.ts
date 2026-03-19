import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { onNutritionalDataChanged } from "@/lib/changes/cascadeHandler";
import type { Formula } from "@/types/database";

/**
 * GET  /api/products/[id]/formula  — fetch the active formula for this product
 * PATCH /api/products/[id]/formula  — update nutritional data on the active formula,
 *                                    triggers onNutritionalDataChanged cascade
 */

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: formulaRaw } = await db
    .from("formulas")
    .select("*")
    .eq("product_id", params.id)
    .eq("is_active", true)
    .maybeSingle();

  return NextResponse.json({ formula: (formulaRaw ?? null) as Formula | null });
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

const NUTRITIONAL_FIELDS = [
  "net_weight_g", "serving_size_g",
  "energy_kcal", "fat_g", "saturated_fat_g", "carbohydrate_g",
  "sugars_g", "fibre_g", "protein_g", "salt_g",
  "may_contain_allergens", "storage_conditions", "shelf_life_days",
  "is_locked",
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Fetch current active formula
  const { data: formulaRaw, error: fetchError } = await db
    .from("formulas")
    .select("*")
    .eq("product_id", params.id)
    .eq("is_active", true)
    .maybeSingle();

  if (fetchError || !formulaRaw) {
    return NextResponse.json({ error: "Active formula not found" }, { status: 404 });
  }
  const existingFormula = formulaRaw as Formula;

  // Build patch from allowed fields only
  const patch: Record<string, unknown> = {};
  for (const field of NUTRITIONAL_FIELDS) {
    if (field in body) patch[field] = body[field] ?? null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data: updatedRaw, error: updateError } = await db
    .from("formulas")
    .update(patch)
    .eq("id", existingFormula.id)
    .select("*")
    .single();

  if (updateError || !updatedRaw) {
    return NextResponse.json({ error: "Failed to update formula" }, { status: 500 });
  }

  // Determine whether any nutritional value field changed
  const nutritionalKeys = [
    "energy_kcal", "fat_g", "saturated_fat_g", "carbohydrate_g",
    "sugars_g", "fibre_g", "protein_g", "salt_g",
  ];
  const nutritionalChanged = nutritionalKeys.some((k) => k in patch);

  let cascade = null;
  if (nutritionalChanged) {
    cascade = await onNutritionalDataChanged(
      params.id,
      (updatedRaw as Formula).is_locked,
      db,
      user.email ?? "unknown",
      user.id,
    );
  }

  return NextResponse.json({ formula: updatedRaw as Formula, cascade });
}

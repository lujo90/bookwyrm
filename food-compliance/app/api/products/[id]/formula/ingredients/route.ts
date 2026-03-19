import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { onIngredientAdded } from "@/lib/changes/cascadeHandler";
import type { Ingredient, Formula } from "@/types/database";

/**
 * GET  /api/products/[id]/formula/ingredients  — list ingredients on active formula
 * POST /api/products/[id]/formula/ingredients  — add ingredient, cascade allergens
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
    .select("id")
    .eq("product_id", params.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!formulaRaw) return NextResponse.json({ ingredients: [] });
  const formulaId = (formulaRaw as { id: string }).id;

  const { data: ingsRaw } = await db
    .from("ingredients")
    .select("*")
    .eq("formula_id", formulaId)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ ingredients: (ingsRaw ?? []) as Ingredient[] });
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: {
    name?:           string;
    percentage?:     number;
    supplier_id?:    string | null;
    allergen_codes?: string[];
    is_allergen?:    boolean;
    e_numbers?:      string[];
    is_organic?:     boolean;
    origin_country?: string | null;
    sort_order?:     number;
  };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (body.percentage === undefined || body.percentage <= 0 || body.percentage > 100) {
    return NextResponse.json({ error: "percentage must be > 0 and ≤ 100" }, { status: 400 });
  }

  // Resolve active formula + org
  const { data: formulaRaw } = await db
    .from("formulas")
    .select("id, organisation_id")
    .eq("product_id", params.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!formulaRaw) {
    return NextResponse.json({ error: "No active formula found for this product" }, { status: 404 });
  }
  const formula = formulaRaw as Pick<Formula, "id" | "organisation_id">;

  const { data: ingRaw, error } = await db
    .from("ingredients")
    .insert({
      formula_id:      formula.id,
      organisation_id: formula.organisation_id,
      name:            body.name.trim(),
      percentage:      body.percentage,
      supplier_id:     body.supplier_id     ?? null,
      allergen_codes:  body.allergen_codes  ?? [],
      is_allergen:     body.is_allergen     ?? false,
      e_numbers:       body.e_numbers       ?? [],
      is_organic:      body.is_organic      ?? false,
      origin_country:  body.origin_country  ?? null,
      sort_order:      body.sort_order      ?? 0,
    })
    .select("*")
    .single();

  if (error || !ingRaw) {
    return NextResponse.json({ error: "Failed to add ingredient" }, { status: 500 });
  }
  const ingredient = ingRaw as Ingredient;

  // Cascade: check if new allergens were introduced
  const cascade = await onIngredientAdded(
    params.id,
    { name: ingredient.name, allergen_codes: ingredient.allergen_codes, formula_id: formula.id },
    db,
    user.email ?? "unknown",
    user.id,
  );

  return NextResponse.json({ ingredient, cascade }, { status: 201 });
}

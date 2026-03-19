import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Ingredient } from "@/types/database";

/**
 * PATCH /api/ingredients/[id]
 * Updates an ingredient's supplier link, allergen data, certifications, and COA.
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: Partial<{
    name:            string;
    supplier_id:     string | null;
    allergen_codes:  string[];
    is_allergen:     boolean;
    is_organic:      boolean;
    e_numbers:       string[];
    coa_document_id: string | null;
    review_due_at:   string | null;
  }>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if (body.name            !== undefined) patch.name            = body.name.trim();
  if (body.supplier_id     !== undefined) patch.supplier_id     = body.supplier_id;
  if (body.allergen_codes  !== undefined) patch.allergen_codes  = body.allergen_codes;
  if (body.is_allergen     !== undefined) patch.is_allergen     = body.is_allergen;
  if (body.is_organic      !== undefined) patch.is_organic      = body.is_organic;
  if (body.e_numbers       !== undefined) patch.e_numbers       = body.e_numbers;
  if (body.coa_document_id !== undefined) patch.coa_document_id = body.coa_document_id;
  if (body.review_due_at   !== undefined) patch.review_due_at   = body.review_due_at;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data: updatedRaw, error } = await db
    .from("ingredients")
    .update(patch)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error || !updatedRaw) {
    return NextResponse.json({ error: "Failed to update ingredient" }, { status: 500 });
  }

  // Fetch profile for audit log
  const { data: profileRaw } = await db
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { organisation_id: string } | null;

  if (profile) {
    const updated = updatedRaw as Ingredient;
    await db.from("audit_log").insert({
      organisation_id: profile.organisation_id,
      product_id:      null,
      actor_id:        user.id,
      actor_email:     user.email ?? "unknown",
      action_type:     "ingredient_updated",
      description:     `Ingredient "${updated.name}" updated`,
      resource_type:   "ingredient",
      resource_id:     params.id,
      metadata:        { fields: Object.keys(patch) },
    });
  }

  return NextResponse.json({ ingredient: updatedRaw as Ingredient });
}

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Supplier, Ingredient } from "@/types/database";

/**
 * GET    /api/suppliers/[id]  — fetch supplier + its ingredients
 * PATCH  /api/suppliers/[id]  — update supplier fields
 * DELETE /api/suppliers/[id]  — delete supplier (only if no ingredients)
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

  const { data: supplierRaw, error } = await db
    .from("suppliers")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !supplierRaw) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  // Fetch ingredients that use this supplier (with formula + product names)
  const { data: ingredientsRaw } = await db
    .from("ingredients")
    .select("id, name, percentage, allergen_codes, is_organic, formula_id")
    .eq("supplier_id", params.id);

  return NextResponse.json({
    supplier:    supplierRaw as Supplier,
    ingredients: (ingredientsRaw ?? []) as Pick<Ingredient, "id" | "name" | "percentage" | "allergen_codes" | "is_organic" | "formula_id">[],
  });
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: Partial<{
    name:           string;
    country:        string;
    contact_email:  string;
    certifications: string[];
    risk_rating:    string;
    notes:          string;
    review_date:    string;
  }>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validRatings = ["low", "medium", "high"];
  const patch: Record<string, unknown> = {};

  if (body.name          !== undefined) patch.name           = body.name.trim();
  if (body.country       !== undefined) patch.country        = body.country?.trim() || null;
  if (body.contact_email !== undefined) patch.contact_email  = body.contact_email?.trim() || null;
  if (body.certifications !== undefined) patch.certifications = body.certifications;
  if (body.risk_rating   !== undefined && validRatings.includes(body.risk_rating))
    patch.risk_rating = body.risk_rating;
  if (body.notes         !== undefined) patch.notes          = body.notes?.trim() || null;
  if (body.review_date   !== undefined) patch.review_date    = body.review_date || null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data: updatedRaw, error } = await db
    .from("suppliers")
    .update(patch)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error || !updatedRaw) {
    return NextResponse.json({ error: "Failed to update supplier" }, { status: 500 });
  }

  return NextResponse.json({ supplier: updatedRaw as Supplier });
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // Prevent deletion if ingredients are still linked
  const { data: linkedRaw } = await db
    .from("ingredients")
    .select("id")
    .eq("supplier_id", params.id)
    .limit(1);

  if ((linkedRaw ?? []).length > 0) {
    return NextResponse.json(
      { error: "Cannot delete a supplier that is linked to ingredients. Unlink them first." },
      { status: 409 },
    );
  }

  const { error } = await db
    .from("suppliers")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 });

  return NextResponse.json({ success: true });
}

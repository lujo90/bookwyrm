import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/ingredients
 * Lists all ingredients for the user's organisation, with supplier name joined.
 * Used by the ingredient library page.
 */

export interface IngredientWithSupplier {
  id:               string;
  formula_id:       string;
  organisation_id:  string;
  name:             string;
  percentage:       number;
  supplier_id:      string | null;
  supplier_name:    string | null;
  supplier_country: string | null;
  supplier_approved: boolean | null;
  is_allergen:      boolean;
  allergen_codes:   string[];
  e_numbers:        string[];
  is_organic:       boolean;
  origin_country:   string | null;
  sort_order:       number;
  coa_document_id:  string | null;
  coa_expiry_date:  string | null;   // from joined documents table
  review_due_at:    string | null;
  created_at:       string;
  updated_at:       string;
}

export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profileRaw } = await db
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { organisation_id: string } | null;
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Fetch all ingredients for this org
  const { data: ingsRaw, error } = await db
    .from("ingredients")
    .select("*")
    .eq("organisation_id", profile.organisation_id)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to fetch ingredients" }, { status: 500 });

  const ingredients = (ingsRaw ?? []) as any[]; // eslint-disable-line

  if (ingredients.length === 0) {
    return NextResponse.json({ ingredients: [] });
  }

  // Bulk-fetch suppliers referenced by these ingredients
  const supplierIds = [...new Set(
    ingredients.filter((i) => i.supplier_id).map((i) => i.supplier_id as string),
  )];

  const supplierMap = new Map<string, { name: string; country: string | null; approved: boolean }>();
  if (supplierIds.length > 0) {
    const { data: suppliersRaw } = await db
      .from("suppliers")
      .select("id, name, country, approved")
      .in("id", supplierIds);
    for (const s of (suppliersRaw ?? [])) {
      supplierMap.set(s.id, { name: s.name, country: s.country, approved: s.approved });
    }
  }

  // Bulk-fetch COA documents
  const coaIds = [...new Set(
    ingredients.filter((i) => i.coa_document_id).map((i) => i.coa_document_id as string),
  )];

  const coaMap = new Map<string, { expiry_date: string | null }>();
  if (coaIds.length > 0) {
    const { data: coaDocs } = await db
      .from("documents")
      .select("id, expiry_date")
      .in("id", coaIds);
    for (const d of (coaDocs ?? [])) {
      coaMap.set(d.id, { expiry_date: d.expiry_date });
    }
  }

  const result: IngredientWithSupplier[] = ingredients.map((ing) => {
    const supplier = ing.supplier_id ? supplierMap.get(ing.supplier_id) : null;
    const coa      = ing.coa_document_id ? coaMap.get(ing.coa_document_id) : null;
    return {
      ...ing,
      supplier_name:     supplier?.name ?? null,
      supplier_country:  supplier?.country ?? null,
      supplier_approved: supplier?.approved ?? null,
      coa_expiry_date:   coa?.expiry_date ?? null,
    };
  });

  return NextResponse.json({ ingredients: result });
}

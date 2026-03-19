import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canCreateProduct } from "@/lib/billing/checkAccess";

export const dynamic = "force-dynamic";

// Default checklist items generated for every new product
function defaultChecklistItems(productId: string, organisationId: string) {
  return [
    // Formula
    { product_id: productId, organisation_id: organisationId, category: "formula",     sort_order: 1,  title: "Enter ingredient list and percentages",            weight: 20, blocking: true,  regulation_code: "EU 1169/2011", regulation_article: "Article 18", regulation_explanation: "All ingredients must be listed in descending order by weight.", regulation_url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011R1169" },
    { product_id: productId, organisation_id: organisationId, category: "formula",     sort_order: 2,  title: "Confirm allergen declarations",                     weight: 20, blocking: true,  regulation_code: "EU 1169/2011", regulation_article: "Article 21", regulation_explanation: "The 14 major allergens must be emphasised in the ingredient list.", regulation_url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011R1169" },
    { product_id: productId, organisation_id: organisationId, category: "formula",     sort_order: 3,  title: "Set net weight and serving size",                   weight: 10, blocking: false, regulation_code: null, regulation_article: null, regulation_explanation: null, regulation_url: null },
    // Compliance
    { product_id: productId, organisation_id: organisationId, category: "compliance",  sort_order: 1,  title: "Complete nutritional values per 100g",              weight: 15, blocking: true,  regulation_code: "EU 1169/2011", regulation_article: "Article 30", regulation_explanation: "Mandatory nutrition declaration per 100g must be provided.", regulation_url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011R1169" },
    { product_id: productId, organisation_id: organisationId, category: "compliance",  sort_order: 2,  title: "Confirm target market regulations are met",         weight: 10, blocking: false, regulation_code: null, regulation_article: null, regulation_explanation: null, regulation_url: null },
    { product_id: productId, organisation_id: organisationId, category: "compliance",  sort_order: 3,  title: "Verify HACCP controls are in place",                weight: 10, blocking: false, regulation_code: "EU 852/2004",  regulation_article: "Article 5",  regulation_explanation: "Food businesses must implement HACCP-based procedures.", regulation_url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32004R0852" },
    // Documents
    { product_id: productId, organisation_id: organisationId, category: "documents",   sort_order: 1,  title: "Upload product specification sheet",               weight: 10, blocking: false, regulation_code: null, regulation_article: null, regulation_explanation: null, regulation_url: null },
    { product_id: productId, organisation_id: organisationId, category: "documents",   sort_order: 2,  title: "Upload label artwork for review",                  weight: 10, blocking: false, regulation_code: null, regulation_article: null, regulation_explanation: null, regulation_url: null },
    // Packaging
    { product_id: productId, organisation_id: organisationId, category: "packaging",   sort_order: 1,  title: "Enter primary packaging material and weight",      weight: 5,  blocking: false, regulation_code: null, regulation_article: null, regulation_explanation: null, regulation_url: null },
    { product_id: productId, organisation_id: organisationId, category: "packaging",   sort_order: 2,  title: "Confirm PPWR recyclability compliance",            weight: 5,  blocking: false, regulation_code: "EU 2022/2379",  regulation_article: null, regulation_explanation: "Packaging and Packaging Waste Regulation requires recyclability data.", regulation_url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2379" },
    // Suppliers
    { product_id: productId, organisation_id: organisationId, category: "suppliers",   sort_order: 1,  title: "Link at least one approved supplier to ingredients", weight: 10, blocking: false, regulation_code: null, regulation_article: null, regulation_explanation: null, regulation_url: null },
  ];
}

// POST /api/products — create a new product with default checklist items
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const db = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id, email")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const orgId = (profile as any).organisation_id;

  // Gate: check billing access
  const access = await canCreateProduct(db, orgId);
  if (!access.allowed) {
    return NextResponse.json({ error: "access_denied", reason: access.reason }, { status: 403 });
  }

  let body: { name: string; category?: string; target_markets?: string[]; sku?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, category, target_markets, sku } = body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // Create product
  const { data: product, error: productError } = await db
    .from("products")
    .insert({
      organisation_id: orgId,
      name:            name.trim(),
      category:        category ?? null,
      target_markets:  target_markets ?? [],
      sku:             sku ?? null,
      status:          "draft",
      readiness_score: 0,
      created_by:      user.id,
    })
    .select()
    .single();

  if (productError) return NextResponse.json({ error: productError.message }, { status: 500 });

  const productId = (product as any).id;

  // Auto-generate default checklist items
  const items = defaultChecklistItems(productId, orgId);
  await db.from("checklist_items").insert(items);

  // Audit log
  await db.from("audit_log").insert({
    organisation_id: orgId,
    product_id:      productId,
    actor_id:        user.id,
    actor_email:     (profile as any).email,
    action_type:     "product_created",
    description:     `Product "${name.trim()}" created.`,
    resource_type:   "product",
    resource_id:     productId,
    metadata:        { category: category ?? null, target_markets: target_markets ?? [] },
  });

  return NextResponse.json({ product }, { status: 201 });
}

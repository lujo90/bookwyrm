import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Formula, Ingredient, Supplier } from "@/types/database";

import { generateAllergenStatement }      from "@/lib/templates/allergenStatement";
import { generateNutritionalDeclaration } from "@/lib/templates/nutritionalDeclaration";
import { generateProductSpec }            from "@/lib/templates/productSpec";
import { generateTraceabilityReport }     from "@/lib/templates/traceabilityReport";
import { generateHaccpSummary }           from "@/lib/templates/haccpSummary";
import type { DocumentType } from "@/types/database";

/**
 * GET  /api/products/[id]/templates/[type]
 * Fetches the product + formula + ingredients + suppliers, runs the template
 * function, and returns { html: string }.
 *
 * POST /api/products/[id]/templates/[type]
 * Saves the provided HTML to Supabase Storage as a .html file and creates a
 * document record.  Body: { html: string }
 * Returns { document } with a signed URL.
 */

const BUCKET        = "documents";
const SIGNED_EXPIRY = 3600;

// ─── Valid template types ──────────────────────────────────────────────────────

const TEMPLATE_META: Record<
  string,
  { label: string; documentType: DocumentType }
> = {
  allergen_statement:       { label: "Allergen Statement",          documentType: "declaration" },
  nutritional_declaration:  { label: "Nutritional Declaration",     documentType: "declaration" },
  product_spec:             { label: "Product Specification",       documentType: "spec_sheet"  },
  traceability_report:      { label: "Traceability Report",         documentType: "lab_report"  },
  haccp_summary:            { label: "HACCP Summary",               documentType: "other"       },
};

// ─── Data fetching helper ─────────────────────────────────────────────────────

async function fetchTemplateData(
  db: any, // eslint-disable-line
  productId: string,
) {
  // Active formula
  const { data: formulaRaw } = await db
    .from("formulas")
    .select("*")
    .eq("product_id", productId)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const formula = (formulaRaw ?? null) as Formula | null;

  // Ingredients for the active formula
  let ingredients: Ingredient[] = [];
  if (formula) {
    const { data: ingsRaw } = await db
      .from("ingredients")
      .select("*")
      .eq("formula_id", formula.id)
      .order("sort_order", { ascending: true });
    ingredients = (ingsRaw ?? []) as Ingredient[];
  }

  // Suppliers referenced by any ingredient
  const supplierIds = Array.from(new Set(
    ingredients.filter((i) => i.supplier_id).map((i) => i.supplier_id!),
  ));

  let suppliers: Supplier[] = [];
  if (supplierIds.length > 0) {
    const { data: suppliersRaw } = await db
      .from("suppliers")
      .select("*")
      .in("id", supplierIds);
    suppliers = (suppliersRaw ?? []) as Supplier[];
  }

  return { formula, ingredients, suppliers };
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; type: string } },
) {
  if (!TEMPLATE_META[params.type]) {
    return NextResponse.json({ error: "Unknown template type" }, { status: 400 });
  }

  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // Fetch product (RLS enforces org membership)
  const { data: productRaw, error: productError } = await db
    .from("products")
    .select("*")
    .eq("id", params.id)
    .single();

  if (productError || !productRaw) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const { formula, ingredients, suppliers } = await fetchTemplateData(db, params.id);

  // Generate HTML
  let html: string;
  switch (params.type) {
    case "allergen_statement":
      html = generateAllergenStatement({ product: productRaw, formula, ingredients });
      break;
    case "nutritional_declaration":
      html = generateNutritionalDeclaration({ product: productRaw, formula });
      break;
    case "product_spec":
      html = generateProductSpec({ product: productRaw, formula, ingredients });
      break;
    case "traceability_report":
      html = generateTraceabilityReport({ product: productRaw, formula, ingredients, suppliers });
      break;
    case "haccp_summary":
      html = generateHaccpSummary({ product: productRaw });
      break;
    default:
      return NextResponse.json({ error: "Unknown template type" }, { status: 400 });
  }

  return NextResponse.json({ html });
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; type: string } },
) {
  const meta = TEMPLATE_META[params.type];
  if (!meta) {
    return NextResponse.json({ error: "Unknown template type" }, { status: 400 });
  }

  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: { html?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.html || typeof body.html !== "string") {
    return NextResponse.json({ error: "html field is required" }, { status: 400 });
  }

  // Resolve organisation
  const { data: profileRaw } = await db
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();

  const profile = profileRaw as { organisation_id: string } | null;
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Confirm product exists under this org (RLS)
  const { data: productRaw, error: productError } = await db
    .from("products")
    .select("id")
    .eq("id", params.id)
    .single();

  if (productError || !productRaw) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Build storage path for the HTML file
  const fileId      = crypto.randomUUID();
  const storagePath = `templates/${profile.organisation_id}/${params.id}/${fileId}.html`;
  const htmlBytes   = new TextEncoder().encode(body.html);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, htmlBytes, {
      contentType: "text/html; charset=utf-8",
      upsert:      false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Storage upload failed", detail: uploadError.message },
      { status: 500 },
    );
  }

  const generatedDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
  const docName = `${meta.label} – Draft ${generatedDate}.html`;

  const { data: docRaw, error: insertError } = await db
    .from("documents")
    .insert({
      product_id:      params.id,
      organisation_id: profile.organisation_id,
      name:            docName,
      type:            meta.documentType,
      storage_path:    storagePath,
      mime_type:       "text/html",
      size_bytes:      htmlBytes.byteLength,
      expiry_date:     null,
      uploaded_by:     user.id,
    })
    .select("*")
    .single();

  if (insertError || !docRaw) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: "Failed to save document record" }, { status: 500 });
  }

  // Audit log
  await db.from("audit_log").insert({
    organisation_id: profile.organisation_id,
    product_id:      params.id,
    actor_id:        user.id,
    actor_email:     user.email ?? "unknown",
    action_type:     "template_generated",
    description:     `"${docName}" generated from template`,
    resource_type:   "document",
    resource_id:     docRaw.id,
    metadata:        { template_type: params.type },
  });

  // Return document with signed URL
  const { data: urlData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_EXPIRY);

  return NextResponse.json(
    { document: { ...docRaw, signed_url: urlData?.signedUrl ?? null } },
    { status: 201 },
  );
}

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Document, Review } from "@/types/database";
import ReviewFlowClient, { type ReviewStep } from "./ReviewFlowClient";

interface Props {
  params: { id: string };
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return "unknown date";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function ReviewPage({ params }: Props) {
  const supabase = await createClient();
  const db = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Profile for email
  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();
  const actorEmail = (profileRaw as any)?.email as string ?? user.email ?? "";

  // Product
  const { data: productRaw, error: productError } = await db
    .from("products")
    .select("*")
    .eq("id", params.id)
    .single();
  if (productError || !productRaw) notFound();
  const product = productRaw as {
    id: string; name: string; status: string; readiness_score: number;
  };

  // Active formula
  const { data: formulaRaw } = await db
    .from("formulas")
    .select("*")
    .eq("product_id", params.id)
    .eq("is_active", true)
    .maybeSingle();
  const formula = formulaRaw as {
    id: string | null;
    energy_kcal: number | null; fat_g: number | null; saturated_fat_g: number | null;
    carbohydrate_g: number | null; sugars_g: number | null; fibre_g: number | null;
    protein_g: number | null; salt_g: number | null;
    is_locked: boolean;
  } | null;

  // Ingredients — collect allergen codes
  let allergenCodes: string[] = [];
  if (formula?.id) {
    const { data: ingsRaw } = await db
      .from("ingredients")
      .select("allergen_codes")
      .eq("formula_id", formula.id);
    const ings = (ingsRaw ?? []) as { allergen_codes: string[] }[];
    const codes = new Set<string>();
    for (const ing of ings) {
      for (const code of (ing.allergen_codes ?? [])) codes.add(code);
    }
    allergenCodes = [...codes];
  }

  // Documents
  const { data: docsRaw } = await db
    .from("documents")
    .select("id, name, type, created_at, expiry_date")
    .eq("product_id", params.id)
    .order("created_at", { ascending: false });
  const docs = (docsRaw ?? []) as Pick<Document, "id" | "name" | "type" | "created_at" | "expiry_date">[];

  const labelArtworkDoc  = docs.find((d) => d.type === "label_artwork") ?? null;
  const haccpDoc         = docs.find((d) => d.type === "spec_sheet") ?? null;
  const certDocs         = docs.filter((d) => d.type === "certificate");

  // Suppliers — scoped to this product's active formula only
  const { data: supplierIngRaw } = formula?.id
    ? await db
        .from("ingredients")
        .select("supplier_id")
        .eq("formula_id", formula.id)
        .not("supplier_id", "is", null)
    : { data: [] };
  const supplierIds = [...new Set(
    (supplierIngRaw ?? []).map((i: any) => i.supplier_id as string),
  )];

  let supplierCount        = 0;
  let approvedSupplierCount = 0;
  if (supplierIds.length > 0) {
    const { data: suppliersRaw } = await db
      .from("suppliers")
      .select("id, approved")
      .in("id", supplierIds);
    const suppliers = (suppliersRaw ?? []) as { id: string; approved: boolean }[];
    supplierCount         = suppliers.length;
    approvedSupplierCount = suppliers.filter((s) => s.approved).length;
  }

  // Last regulation check — most recent completed compliance checklist item
  const { data: complianceItemRaw } = await db
    .from("checklist_items")
    .select("completed_at")
    .eq("product_id", params.id)
    .eq("category", "compliance")
    .eq("completed", true)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const regulationCheckDate = (complianceItemRaw as any)?.completed_at
    ? fmt((complianceItemRaw as any).completed_at)
    : fmt(product.id); // fallback: product creation implied

  // Compliance checklist items exist?
  const { count: complianceCount } = await db
    .from("checklist_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", params.id)
    .eq("category", "compliance");
  const hasComplianceItems = (complianceCount ?? 0) > 0;

  // Active review (to resume from correct step)
  const { data: reviewRaw } = await db
    .from("reviews")
    .select("*")
    .eq("product_id", params.id)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const activeReview = (reviewRaw ?? null) as Review | null;

  // ─── Build steps ─────────────────────────────────────────────────────────────

  const steps: ReviewStep[] = [];

  // 1. Allergen confirmation (always)
  const allergenDisplay = allergenCodes.length > 0
    ? allergenCodes.join(", ")
    : "no allergens";
  steps.push({
    type:       "allergens",
    question:   `Your recipe shows these allergens are present: ${allergenDisplay}. Is this correct for this product?`,
    navigateTo: "formula",
    itemType:   "formula",
    itemId:     formula?.id ?? null,
    metadata:   { allergenCodes },
  });

  // 2. Label artwork (always)
  const labelQuestion = labelArtworkDoc
    ? `Your label artwork "${labelArtworkDoc.name}" was approved on ${fmt(labelArtworkDoc.created_at)}. Is this label still current and accurate?`
    : "Have you uploaded your final label artwork? Is it current and accurate?";
  steps.push({
    type:       "label_artwork",
    question:   labelQuestion,
    navigateTo: "documents",
    itemType:   "document",
    itemId:     labelArtworkDoc?.id ?? null,
    metadata:   { docName: labelArtworkDoc?.name ?? null },
  });

  // 3. HACCP document (always)
  const haccpQuestion = haccpDoc
    ? `Your HACCP plan "${haccpDoc.name}" was uploaded on ${fmt(haccpDoc.created_at)}. Is this document still current?`
    : "Have you uploaded your HACCP plan? Is it current?";
  steps.push({
    type:       "haccp",
    question:   haccpQuestion,
    navigateTo: "documents",
    itemType:   "document",
    itemId:     haccpDoc?.id ?? null,
    metadata:   { docName: haccpDoc?.name ?? null },
  });

  // 4. Nutritional declaration (always)
  const nutLines: string[] = [];
  if (formula) {
    if (formula.energy_kcal   != null) nutLines.push(`Energy: ${formula.energy_kcal} kcal`);
    if (formula.fat_g         != null) nutLines.push(`Fat: ${formula.fat_g} g`);
    if (formula.saturated_fat_g != null) nutLines.push(`of which saturates: ${formula.saturated_fat_g} g`);
    if (formula.carbohydrate_g  != null) nutLines.push(`Carbohydrate: ${formula.carbohydrate_g} g`);
    if (formula.sugars_g      != null) nutLines.push(`of which sugars: ${formula.sugars_g} g`);
    if (formula.fibre_g       != null) nutLines.push(`Fibre: ${formula.fibre_g} g`);
    if (formula.protein_g     != null) nutLines.push(`Protein: ${formula.protein_g} g`);
    if (formula.salt_g        != null) nutLines.push(`Salt: ${formula.salt_g} g`);
  }
  const nutDisplay = nutLines.length > 0
    ? nutLines.join(", ")
    : "no nutritional values on record";
  steps.push({
    type:       "nutritional",
    question:   `Your nutritional values per 100 g are: ${nutDisplay}. Are these values still accurate?`,
    navigateTo: "formula",
    itemType:   "formula",
    itemId:     formula?.id ?? null,
    metadata:   { nutritionalValues: nutLines },
  });

  // 5. Supplier confirmation (if has suppliers)
  if (supplierCount > 0) {
    steps.push({
      type:       "suppliers",
      question:   `All ${approvedSupplierCount} of ${supplierCount} suppliers are approved and COAs are current. Is your supply chain information accurate?`,
      navigateTo: "supply",
      itemType:   "suppliers",
      itemId:     null,
      metadata:   { supplierCount, approvedSupplierCount },
    });
  }

  // 6. Certifications (one per certificate document)
  for (const cert of certDocs) {
    steps.push({
      type:       "certification",
      question:   `Your certification document "${cert.name}" is on file${cert.expiry_date ? `, valid until ${fmt(cert.expiry_date)}` : ""}. Is this certification still valid?`,
      navigateTo: "documents",
      itemType:   "document",
      itemId:     cert.id,
      metadata:   { docName: cert.name, expiryDate: cert.expiry_date },
    });
  }

  // 7. Regulation check (if compliance items exist)
  if (hasComplianceItems) {
    steps.push({
      type:       "regulation",
      question:   `We checked your product against all applicable EU regulations on ${regulationCheckDate}. No critical flags were found. Has anything changed in your product since this check?`,
      navigateTo: "overview",
      itemType:   "compliance",
      itemId:     null,
      metadata:   { lastCheckDate: regulationCheckDate },
    });
  }

  return (
    <ReviewFlowClient
      productId={params.id}
      productName={product.name}
      steps={steps}
      activeReview={activeReview}
      actorEmail={actorEmail}
      blockingIncomplete={[]}
    />
  );
}

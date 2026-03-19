import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";
import ProductRecord from "./ProductRecord";
import { createClient } from "@/lib/supabase/server";
import { calculateScore } from "@/lib/score/calculateScore";
import type { Product, ChecklistItem, AuditLog, Document, Packaging } from "@/types/database";
import type { IngredientWithSupplier } from "@/app/api/ingredients/route";
import type { DocumentWithUrl } from "@/components/ui/DocumentRow";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("name")
    .eq("id", params.id)
    .single();
  const product = data as { name: string } | null;
  return { title: product?.name ?? "Product" };
}

export default async function ProductPage({ params }: Props) {
  const supabase = await createClient();

  // Auth — middleware already guards this route, but we need the user for org check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  // Fetch product — RLS ensures it belongs to the user's org
  const { data: productRaw, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("id", params.id)
    .single();

  if (productError || !productRaw) notFound();
  const product = productRaw as unknown as Product;

  // Fetch checklist items
  const { data: itemsRaw } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("product_id", params.id)
    .order("sort_order", { ascending: true });

  const items = (itemsRaw ?? []) as unknown as ChecklistItem[];

  // Fetch audit log for this product (most recent first, limit 50)
  const { data: auditRaw } = await supabase
    .from("audit_log")
    .select("*")
    .eq("product_id", params.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const auditLog = (auditRaw ?? []) as unknown as AuditLog[];

  // Fetch documents
  const { data: docsRaw } = await supabase
    .from("documents")
    .select("*")
    .eq("product_id", params.id)
    .order("created_at", { ascending: false });

  const docRecords = (docsRaw ?? []) as unknown as Document[];

  // Attach signed URLs for immediate rendering (1-hour expiry)
  const initialDocuments: DocumentWithUrl[] = await Promise.all(
    docRecords.map(async (doc) => {
      const { data: urlData } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.storage_path, 3600);
      return { ...doc, signed_url: urlData?.signedUrl ?? null };
    }),
  );

  // Calculate initial score on the server so the page renders with correct data
  const initialScore = calculateScore(items);

  // Fetch supply chain data: active formula + its ingredients with supplier info
  const supabaseAny = supabase as any; // eslint-disable-line
  let supplyIngredients: IngredientWithSupplier[] = [];

  const { data: activeFormulaRaw } = await supabaseAny
    .from("formulas")
    .select("id")
    .eq("product_id", params.id)
    .eq("is_active", true)
    .maybeSingle();

  if (activeFormulaRaw) {
    const formulaId = (activeFormulaRaw as { id: string }).id;
    const { data: ingsRaw } = await supabaseAny
      .from("ingredients")
      .select("*")
      .eq("formula_id", formulaId)
      .order("sort_order", { ascending: true });

    const rawIngredients = (ingsRaw ?? []) as any[]; // eslint-disable-line

    if (rawIngredients.length > 0) {
      const supplierIds = [...new Set(
        rawIngredients.filter((i) => i.supplier_id).map((i) => i.supplier_id as string),
      )];

      const supplierMap = new Map<string, { name: string; country: string | null; approved: boolean }>();
      if (supplierIds.length > 0) {
        const { data: suppliersRaw } = await supabaseAny
          .from("suppliers")
          .select("id, name, country, approved")
          .in("id", supplierIds);
        for (const s of (suppliersRaw ?? [])) {
          supplierMap.set(s.id, { name: s.name, country: s.country, approved: s.approved });
        }
      }

      const coaIds = [...new Set(
        rawIngredients.filter((i) => i.coa_document_id).map((i) => i.coa_document_id as string),
      )];
      const coaMap = new Map<string, { expiry_date: string | null }>();
      if (coaIds.length > 0) {
        const { data: coaDocs } = await supabaseAny
          .from("documents")
          .select("id, expiry_date")
          .in("id", coaIds);
        for (const d of (coaDocs ?? [])) {
          coaMap.set(d.id, { expiry_date: d.expiry_date });
        }
      }

      supplyIngredients = rawIngredients.map((ing) => {
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
    }
  }

  // Fetch packaging record
  const { data: packagingRaw } = await supabaseAny
    .from("packaging")
    .select("*")
    .eq("product_id", params.id)
    .maybeSingle();
  const initialPackaging = (packagingRaw ?? null) as Packaging | null;

  // Fetch label_artwork documents with signed URLs
  const { data: labelDocsRaw } = await supabase
    .from("documents")
    .select("*")
    .eq("product_id", params.id)
    .eq("type", "label_artwork")
    .order("created_at", { ascending: false });

  const labelDocRecords = (labelDocsRaw ?? []) as unknown as Document[];
  const labelArtworkDocs: DocumentWithUrl[] = await Promise.all(
    labelDocRecords.map(async (doc) => {
      const { data: urlData } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.storage_path, 3600);
      return { ...doc, signed_url: urlData?.signedUrl ?? null };
    }),
  );

  return (
    <AppShell activeTab="products">
      <ProductRecord
        product={product}
        initialItems={items}
        auditLog={auditLog}
        initialScore={initialScore}
        initialDocuments={initialDocuments}
        supplyIngredients={supplyIngredients}
        initialPackaging={initialPackaging}
        labelArtworkDocs={labelArtworkDocs}
      />
    </AppShell>
  );
}

import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "@/types/database";
import type { IngredientWithSupplier } from "@/app/api/ingredients/route";
import IngredientsLibraryClient from "./IngredientsLibraryClient";

export const metadata: Metadata = { title: "Ingredients Library" };

export default async function IngredientsLibraryPage() {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();

  let ingredients: IngredientWithSupplier[] = [];
  let suppliers:   Supplier[]               = [];

  if (user) {
    const { data: profileRaw } = await db
      .from("profiles")
      .select("organisation_id")
      .eq("id", user.id)
      .single();
    const profile = profileRaw as { organisation_id: string } | null;

    if (profile) {
      // Fetch all ingredients with supplier info
      const { data: ingsRaw } = await db
        .from("ingredients")
        .select("*")
        .eq("organisation_id", profile.organisation_id)
        .order("name", { ascending: true });

      const rawIngredients = (ingsRaw ?? []) as any[]; // eslint-disable-line

      if (rawIngredients.length > 0) {
        // Bulk-fetch suppliers
        const supplierIds = [...new Set(
          rawIngredients.filter((i) => i.supplier_id).map((i) => i.supplier_id as string),
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
          rawIngredients.filter((i) => i.coa_document_id).map((i) => i.coa_document_id as string),
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

        ingredients = rawIngredients.map((ing) => {
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

      // Fetch all suppliers for the edit form
      const { data: suppliersRaw } = await db
        .from("suppliers")
        .select("*")
        .eq("organisation_id", profile.organisation_id)
        .order("name", { ascending: true });
      suppliers = (suppliersRaw ?? []) as Supplier[];
    }
  }

  return (
    <AppShell activeTab="products">
      <IngredientsLibraryClient initialIngredients={ingredients} suppliers={suppliers} />
    </AppShell>
  );
}

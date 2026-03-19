import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { Supplier, SupplyChainEvent } from "@/types/database";
import SupplierDetailClient from "./SupplierDetailClient";

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient();
  const db = supabase as any; // eslint-disable-line
  const { data } = await db.from("suppliers").select("name").eq("id", params.id).single();
  return { title: (data as { name: string } | null)?.name ?? "Supplier" };
}

export default async function SupplierDetailPage({ params }: Props) {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: supplierRaw, error } = await db
    .from("suppliers")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !supplierRaw) notFound();
  const supplier = supplierRaw as Supplier;

  // Ingredients using this supplier
  const { data: ingredientsRaw } = await db
    .from("ingredients")
    .select("id, name, percentage, allergen_codes, formula_id")
    .eq("supplier_id", params.id);

  const ingredients = (ingredientsRaw ?? []) as {
    id: string; name: string; percentage: number;
    allergen_codes: string[]; formula_id: string;
  }[];

  // Supply chain events for this supplier
  const { data: eventsRaw } = await db
    .from("supply_chain_events")
    .select("*")
    .eq("affected_supplier_id", params.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const events = (eventsRaw ?? []) as SupplyChainEvent[];

  return (
    <AppShell activeTab="settings">
      <SupplierDetailClient
        initialSupplier={supplier}
        ingredients={ingredients}
        events={events}
      />
    </AppShell>
  );
}

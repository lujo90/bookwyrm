import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "@/types/database";
import SupplierListClient from "./SupplierListClient";

export const metadata: Metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();

  let suppliers: Supplier[] = [];

  if (user) {
    const { data: profileRaw } = await db
      .from("profiles")
      .select("organisation_id")
      .eq("id", user.id)
      .single();
    const profile = profileRaw as { organisation_id: string } | null;

    if (profile) {
      const { data: suppliersRaw } = await db
        .from("suppliers")
        .select("*")
        .eq("organisation_id", profile.organisation_id)
        .order("name", { ascending: true });
      suppliers = (suppliersRaw ?? []) as Supplier[];
    }
  }

  return (
    <AppShell activeTab="settings">
      <SupplierListClient initialSuppliers={suppliers} />
    </AppShell>
  );
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";
import ProductRecord from "./ProductRecord";
import { createClient } from "@/lib/supabase/server";
import { calculateScore } from "@/lib/score/calculateScore";
import type { Product, ChecklistItem, AuditLog } from "@/types/database";

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

  // Calculate initial score on the server so the page renders with correct data
  const initialScore = calculateScore(items);

  return (
    <AppShell activeTab="products">
      <ProductRecord
        product={product}
        initialItems={items}
        auditLog={auditLog}
        initialScore={initialScore}
      />
    </AppShell>
  );
}

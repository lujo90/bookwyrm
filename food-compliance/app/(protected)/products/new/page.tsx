import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { canCreateProduct } from "@/lib/billing/checkAccess";
import AppShell from "@/components/layout/AppShell";
import UpgradePrompt from "@/components/ui/UpgradePrompt";
import NewProductForm from "./NewProductForm";

export const metadata: Metadata = { title: "New Product" };

export default async function NewProductPage() {
  const supabase = await createClient();
  const db = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <AppShell activeTab="products">
        <p style={{ padding: 24, color: "#64748B", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>
          Please sign in to add a product.
        </p>
      </AppShell>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();

  const orgId = (profile as any)?.organisation_id;
  const access = orgId ? await canCreateProduct(db, orgId) : { allowed: false, reason: "subscription_inactive" as const };

  if (!access.allowed) {
    return (
      <AppShell activeTab="products">
        <UpgradePrompt reason={access.reason} />
      </AppShell>
    );
  }

  return (
    <AppShell activeTab="products">
      <NewProductForm />
    </AppShell>
  );
}

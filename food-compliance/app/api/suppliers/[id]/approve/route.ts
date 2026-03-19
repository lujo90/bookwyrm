import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleSupplierRevoked } from "@/lib/supply-chain/cascade";
import type { Supplier } from "@/types/database";

/**
 * POST   /api/suppliers/[id]/approve  — approve the supplier
 * DELETE /api/suppliers/[id]/approve  — revoke approval + trigger cascade
 */

// ─── POST: approve ────────────────────────────────────────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
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

  const { data: updatedRaw, error } = await db
    .from("suppliers")
    .update({
      approved:      true,
      approval_date: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error || !updatedRaw) {
    return NextResponse.json({ error: "Failed to approve supplier" }, { status: 500 });
  }

  await db.from("audit_log").insert({
    organisation_id: profile.organisation_id,
    product_id:      null,
    actor_id:        user.id,
    actor_email:     user.email ?? "unknown",
    action_type:     "supplier_approved",
    description:     `Supplier "${(updatedRaw as Supplier).name}" approved`,
    resource_type:   "supplier",
    resource_id:     params.id,
    metadata:        null,
  });

  return NextResponse.json({ supplier: updatedRaw as Supplier });
}

// ─── DELETE: revoke ───────────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
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

  // Fetch supplier name for audit log before revoking
  const { data: supplierRaw } = await db
    .from("suppliers")
    .select("name")
    .eq("id", params.id)
    .single();
  const supplierName = (supplierRaw as { name: string } | null)?.name ?? "Unknown";

  // Revoke approval
  const { data: updatedRaw, error } = await db
    .from("suppliers")
    .update({
      approved:      false,
      approval_date: null,
    })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error || !updatedRaw) {
    return NextResponse.json({ error: "Failed to revoke supplier" }, { status: 500 });
  }

  // Org-level audit log
  await db.from("audit_log").insert({
    organisation_id: profile.organisation_id,
    product_id:      null,
    actor_id:        user.id,
    actor_email:     user.email ?? "unknown",
    action_type:     "supplier_revoked",
    description:     `Supplier "${supplierName}" approval revoked`,
    resource_type:   "supplier",
    resource_id:     params.id,
    metadata:        null,
  });

  // Trigger cascade — resets affected product checklist items
  const cascade = await handleSupplierRevoked(
    params.id,
    profile.organisation_id,
    db,
    user.email ?? "unknown",
    user.id,
  );

  return NextResponse.json({
    supplier: updatedRaw as Supplier,
    cascade,
  });
}

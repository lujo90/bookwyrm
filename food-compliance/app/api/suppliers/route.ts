import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "@/types/database";

/**
 * GET  /api/suppliers   — list all suppliers for the user's organisation
 * POST /api/suppliers   — create a new supplier
 */

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest) {
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

  const { data: suppliersRaw, error } = await db
    .from("suppliers")
    .select("*")
    .eq("organisation_id", profile.organisation_id)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });

  return NextResponse.json({ suppliers: (suppliersRaw ?? []) as Supplier[] });
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: { name?: string; country?: string; contact_email?: string; risk_rating?: string; notes?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data: profileRaw } = await db
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { organisation_id: string } | null;
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const validRatings = ["low", "medium", "high"];
  const riskRating   = validRatings.includes(body.risk_rating ?? "") ? body.risk_rating : "medium";

  const { data: supplierRaw, error } = await db
    .from("suppliers")
    .insert({
      organisation_id: profile.organisation_id,
      name:            body.name.trim(),
      country:         body.country?.trim() || null,
      contact_email:   body.contact_email?.trim() || null,
      risk_rating:     riskRating,
      notes:           body.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error || !supplierRaw) {
    return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 });
  }

  return NextResponse.json({ supplier: supplierRaw as Supplier }, { status: 201 });
}

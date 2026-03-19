import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateScore } from "@/lib/score/calculateScore";
import type { Packaging, ChecklistItem, ScoreBreakdown } from "@/types/database";

/**
 * GET  /api/products/[id]/packaging  — fetch the packaging record (or null)
 * PUT  /api/products/[id]/packaging  — upsert packaging, auto-complete checklist
 *                                      items, recalculate score
 */

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: packagingRaw } = await db
    .from("packaging")
    .select("*")
    .eq("product_id", params.id)
    .maybeSingle();

  return NextResponse.json({ packaging: (packagingRaw ?? null) as Packaging | null });
}

// ─── PUT ──────────────────────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: Partial<Omit<Packaging, "id" | "created_at" | "updated_at">>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const productId = params.id;

  // ── 1. Upsert packaging row ─────────────────────────────────────────────────

  const upsertPayload: Record<string, unknown> = { product_id: productId };

  // Only include fields that are explicitly present in the body
  const fields: (keyof typeof body)[] = [
    "primary_material", "weight_primary_g", "recyclability_code",
    "secondary_material", "weight_secondary_g",
    "ppwr_compliant", "recycled_content_pct",
    "label_dimensions", "label_document_id", "barcode", "barcode_type",
  ];
  for (const field of fields) {
    if (field in body) upsertPayload[field] = body[field] ?? null;
  }

  const { data: packagingRaw, error: upsertError } = await db
    .from("packaging")
    .upsert(upsertPayload, { onConflict: "product_id" })
    .select("*")
    .single();

  if (upsertError || !packagingRaw) {
    return NextResponse.json({ error: "Failed to save packaging" }, { status: 500 });
  }
  const packaging = packagingRaw as Packaging;

  // ── 2. Fetch all packaging checklist items for this product ─────────────────

  const { data: allItemsRaw } = await db
    .from("checklist_items")
    .select("*")
    .eq("product_id", productId);

  const allItems = (allItemsRaw ?? []) as ChecklistItem[];
  const packagingItems = allItems.filter((i) => i.category === "packaging");

  // ── 3. Auto-complete relevant items based on what was saved ─────────────────

  const now      = new Date().toISOString();
  const actorEmail = user.email ?? "unknown";

  // Map: partial title match (lowercase) → condition that marks it complete
  const completionRules: { match: string; condition: boolean }[] = [
    {
      match:     "packaging material",
      condition: !!packaging.primary_material,
    },
    {
      match:     "recyclability",
      condition: !!packaging.recyclability_code,
    },
    {
      match:     "ppwr",
      condition: packaging.ppwr_compliant === true,
    },
    {
      match:     "barcode",
      condition: !!packaging.barcode,
    },
  ];

  for (const rule of completionRules) {
    const item = packagingItems.find(
      (i) => i.title.toLowerCase().includes(rule.match),
    );
    if (!item) continue;

    // Mark complete if condition met and not already complete
    if (rule.condition && !item.completed) {
      await db
        .from("checklist_items")
        .update({ completed: true, completed_at: now, completed_by: actorEmail })
        .eq("id", item.id);
      // Update local copy for score calculation below
      item.completed    = true;
      item.completed_at = now;
      item.completed_by = actorEmail;
    }

    // Mark incomplete if condition no longer met and currently complete
    if (!rule.condition && item.completed) {
      await db
        .from("checklist_items")
        .update({ completed: false, completed_at: null, completed_by: null })
        .eq("id", item.id);
      item.completed    = false;
      item.completed_at = null;
      item.completed_by = null;
    }
  }

  // ── 4. Recalculate score ────────────────────────────────────────────────────

  const scoreResult = calculateScore(allItems);

  await db
    .from("products")
    .update({
      readiness_score:     scoreResult.total,
      readiness_breakdown: scoreResult.breakdown as ScoreBreakdown,
    })
    .eq("id", productId);

  // ── 5. Audit log ────────────────────────────────────────────────────────────

  const { data: profileRaw } = await db
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { organisation_id: string } | null;

  if (profile) {
    await db.from("audit_log").insert({
      organisation_id: profile.organisation_id,
      product_id:      productId,
      actor_id:        user.id,
      actor_email:     actorEmail,
      action_type:     "packaging_updated",
      description:     "Packaging record updated",
      resource_type:   "packaging",
      resource_id:     packaging.id,
      metadata:        { fields: Object.keys(upsertPayload).filter((k) => k !== "product_id") },
    });
  }

  return NextResponse.json({ packaging, score: scoreResult });
}

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateScore } from "@/lib/score/calculateScore";
import type { ChecklistItem, ScoreBreakdown } from "@/types/database";

/**
 * POST /api/products/[id]/score
 *
 * Recalculates the readiness score from all checklist items for this product.
 * Updates products.readiness_score and products.readiness_breakdown.
 * Inserts an audit_log entry if the score has changed.
 * Returns the new ScoreResult.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  // Supabase TypeScript generics produce `never` for update/insert operations with
  // custom Database types that use Partial<Omit<...>>. Using `any` here is intentional
  // and safe — all data mutations are validated at the app level.
  // eslint-disable-line
  const db = supabase as any; // eslint-disable-line

  // Auth gate
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const productId = params.id;

  // Verify product belongs to user's org and get current score
  const { data: productRaw, error: productError } = await db
    .from("products")
    .select("id, organisation_id, readiness_score")
    .eq("id", productId)
    .single();

  if (productError || !productRaw) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  const product = productRaw as { id: string; organisation_id: string; readiness_score: number };

  // Fetch all checklist items for this product
  const { data: itemsRaw, error: itemsError } = await db
    .from("checklist_items")
    .select("*")
    .eq("product_id", productId);

  if (itemsError) {
    return NextResponse.json({ error: "Failed to fetch checklist items" }, { status: 500 });
  }

  const scoreResult = calculateScore((itemsRaw ?? []) as ChecklistItem[]);

  // Update product
  const { error: updateError } = await db
    .from("products")
    .update({
      readiness_score:     scoreResult.total,
      readiness_breakdown: scoreResult.breakdown as ScoreBreakdown,
    })
    .eq("id", productId);

  if (updateError) {
    return NextResponse.json({ error: "Failed to update score" }, { status: 500 });
  }

  // Insert audit log entry if score changed
  const previousScore = product.readiness_score ?? 0;
  if (scoreResult.total !== previousScore) {
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
        actor_email:     user.email ?? "unknown",
        action_type:     "score_updated",
        description:     `Readiness score changed from ${previousScore} to ${scoreResult.total}`,
        resource_type:   "product",
        resource_id:     productId,
      });
    }
  }

  return NextResponse.json(scoreResult);
}

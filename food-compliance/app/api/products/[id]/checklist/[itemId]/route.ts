import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateScore } from "@/lib/score/calculateScore";
import type { ChecklistItem, ScoreBreakdown } from "@/types/database";

/**
 * PATCH /api/products/[id]/checklist/[itemId]
 *
 * Marks a checklist item complete or incomplete.
 * Body: { completed: boolean }
 *
 * On change:
 *   1. Updates the checklist_items row
 *   2. Sets completed_at / completed_by (or clears them)
 *   3. Recalculates score and updates the product
 *   4. Inserts an audit_log entry
 *
 * Returns: { item: ChecklistItem, score: ScoreResult }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } },
) {
  const supabase = await createClient();
  // Supabase TypeScript generics produce `never` for update/insert operations with
  // custom Database types that use Partial<Omit<...>>. Using `any` here is intentional.
  const db = supabase as any; // eslint-disable-line

  // Auth gate
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: productId, itemId } = params;

  // Parse body
  let body: { completed?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.completed !== "boolean") {
    return NextResponse.json(
      { error: "Body must include { completed: boolean }" },
      { status: 400 },
    );
  }

  const { completed } = body;

  // Verify item exists and belongs to this product (and user's org via RLS)
  const { data: existingRaw, error: fetchError } = await db
    .from("checklist_items")
    .select("*")
    .eq("id", itemId)
    .eq("product_id", productId)
    .single();

  if (fetchError || !existingRaw) {
    return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
  }
  const existing = existingRaw as ChecklistItem;

  // Build update payload
  const now = new Date().toISOString();
  const updatePayload = completed
    ? { completed: true,  completed_at: now,  completed_by: user.email ?? "unknown" }
    : { completed: false, completed_at: null, completed_by: null };

  const { data: updatedItemRaw, error: updateError } = await db
    .from("checklist_items")
    .update(updatePayload)
    .eq("id", itemId)
    .select("*")
    .single();

  if (updateError || !updatedItemRaw) {
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
  const updatedItem = updatedItemRaw as ChecklistItem;

  // Fetch all items to recalculate score
  const { data: allItemsRaw, error: allItemsError } = await db
    .from("checklist_items")
    .select("*")
    .eq("product_id", productId);

  if (allItemsError) {
    return NextResponse.json({ error: "Failed to fetch checklist" }, { status: 500 });
  }

  const scoreResult = calculateScore((allItemsRaw ?? []) as ChecklistItem[]);

  // Update product score
  await db
    .from("products")
    .update({
      readiness_score:     scoreResult.total,
      readiness_breakdown: scoreResult.breakdown as ScoreBreakdown,
    })
    .eq("id", productId);

  // Insert audit log entry
  const { data: profileRaw } = await db
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { organisation_id: string } | null;

  if (profile) {
    const actionType  = completed ? "checklist_item_completed" : "checklist_item_reset";
    const description = completed
      ? `"${existing.title}" marked complete`
      : `"${existing.title}" marked incomplete`;

    await db.from("audit_log").insert({
      organisation_id: profile.organisation_id,
      product_id:      productId,
      actor_id:        user.id,
      actor_email:     user.email ?? "unknown",
      action_type:     actionType,
      description,
      resource_type:   "checklist_item",
      resource_id:     itemId,
      metadata:        { item_title: existing.title, category: existing.category },
    });
  }

  return NextResponse.json({ item: updatedItem, score: scoreResult });
}

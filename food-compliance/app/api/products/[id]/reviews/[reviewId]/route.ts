import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH /api/products/[id]/reviews/[reviewId]
// Updates current_step, status, completed_at, completed_by
// Body: { current_step?: number; status?: string; completed_at?: string; completed_by?: string }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; reviewId: string } },
) {
  const supabase = await createClient();
  const db = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const updates: Record<string, unknown> = {};
  if (body.current_step  !== undefined) updates.current_step  = body.current_step;
  if (body.status        !== undefined) updates.status        = body.status;
  if (body.completed_at  !== undefined) updates.completed_at  = body.completed_at;
  if (body.completed_by  !== undefined) updates.completed_by  = body.completed_by;

  const { data: review, error } = await db
    .from("reviews")
    .update(updates)
    .eq("id", params.reviewId)
    .eq("product_id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If marking complete, optionally approve the product if no blocking items
  if (body.status === "completed" && body.approve_product) {
    await db
      .from("products")
      .update({ status: "approved" })
      .eq("id", params.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("organisation_id, email")
      .eq("id", user.id)
      .single();

    if (profile) {
      await db.from("audit_log").insert({
        organisation_id: (profile as any).organisation_id,
        product_id:      params.id,
        actor_id:        user.id,
        actor_email:     (profile as any).email,
        action_type:     "review_completed",
        description:     "Review completed. Product marked as approved.",
        resource_type:   "review",
        resource_id:     params.reviewId,
        metadata:        null,
      });
    }
  }

  return NextResponse.json({ review });
}

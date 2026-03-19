import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/products/[id]/reviews — return active in_progress review or null
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const db = supabase as any; // eslint-disable-line

  const { data, error } = await db
    .from("reviews")
    .select("*")
    .eq("product_id", params.id)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ review: data ?? null });
}

// POST /api/products/[id]/reviews — create a new review session
// Body: { total_steps: number }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const db = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const total_steps: number = body.total_steps ?? null;

  const { data: review, error } = await db
    .from("reviews")
    .insert({ product_id: params.id, total_steps, current_step: 0, status: "in_progress" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Set product status to in_review
  await db
    .from("products")
    .update({ status: "in_review" })
    .eq("id", params.id);

  // Audit log
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
      action_type:     "review_started",
      description:     `Review started — ${total_steps} steps to complete.`,
      resource_type:   "review",
      resource_id:     (review as any).id,
      metadata:        { total_steps },
    });
  }

  return NextResponse.json({ review }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/products/[id]/reviews/[reviewId]/confirmations
// Logs a review step confirmation and writes an audit_log entry.
// Body: { step, item_type, item_id?, question, confirmed, note? }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; reviewId: string } },
) {
  const supabase = await createClient();
  const db = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id, email")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const actorEmail     = (profile as any).email as string;
  const organisationId = (profile as any).organisation_id as string;

  const body = await req.json();
  const {
    step,
    item_type,
    item_id,
    question,
    confirmed,
    note,
  }: {
    step:      number;
    item_type: string;
    item_id?:  string | null;
    question:  string;
    confirmed: boolean;
    note?:     string | null;
  } = body;

  // Insert review_confirmation row
  const { data: confirmation, error: confError } = await db
    .from("review_confirmations")
    .insert({
      review_id:    params.reviewId,
      step,
      item_type,
      item_id:      item_id ?? null,
      question,
      confirmed,
      confirmed_by: actorEmail,
      note:         note ?? null,
    })
    .select()
    .single();

  if (confError) return NextResponse.json({ error: confError.message }, { status: 500 });

  // Write audit_log entry so it appears in the product's Audit Log tab
  const answeredLabel = confirmed ? "Yes" : "No";
  await db.from("audit_log").insert({
    organisation_id: organisationId,
    product_id:      params.id,
    actor_id:        user.id,
    actor_email:     actorEmail,
    action_type:     "review_confirmation",
    description:     `Review step ${step + 1}: "${question}" — answered ${answeredLabel}.`,
    resource_type:   "review_confirmation",
    resource_id:     (confirmation as any).id,
    metadata:        { step, question, confirmed, note: note ?? null },
  });

  return NextResponse.json({ confirmation }, { status: 201 });
}

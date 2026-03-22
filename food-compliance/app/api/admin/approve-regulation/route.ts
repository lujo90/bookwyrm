import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyAffectedCustomers } from "@/lib/regulations/notifyCustomers";
import type { Regulation } from "@/types/database";

export const dynamic   = "force-dynamic";
export const maxDuration = 120;

interface AiInterpretation {
  plain_language_summary:      string;
  affected_product_categories: string[];
  affected_certifications:     string[];
  affected_channels:           string[];
  proposed_checklist_items:    string[];
  is_amendment_of_existing:    boolean;
  existing_regulation_code:    string | null;
  confidence_score:            number;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "admin"].includes((profile as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = (await req.json()) as { id: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = supabase as any; // eslint-disable-line

  // Fetch the queue row
  const { data: queueRow, error: fetchErr } = await db
    .from("regulation_review_queue")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !queueRow) {
    return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
  }

  const ai = queueRow.ai_interpretation as AiInterpretation | null;
  if (!ai) {
    return NextResponse.json(
      { error: "Run AI interpretation before approving" },
      { status: 422 },
    );
  }

  // Create regulation row from AI interpretation
  const { data: newReg, error: insertErr } = await db
    .from("regulations")
    .insert({
      code:                queueRow.eurlex_celex_number ?? "UNKNOWN",
      title:               ai.plain_language_summary.slice(0, 120),
      summary:             ai.plain_language_summary,
      applies_to:          ai.affected_product_categories ?? [],
      markets:             ["EU"],
      channels:            ai.affected_channels ?? [],
      certifications:      ai.affected_certifications ?? [],
      checklist_item_refs: ai.proposed_checklist_items ?? [],
      official_url:        queueRow.eurlex_document_url ?? null,
      status:              "active",
      ai_confidence_score: ai.confidence_score ?? null,
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Update queue row status
  await db
    .from("regulation_review_queue")
    .update({ status: "approved", proposed_regulation_id: newReg.id })
    .eq("id", id);

  // Notify affected customers (fire and forget — don't block the response)
  notifyAffectedCustomers(newReg as Regulation).catch((err) =>
    console.error("[approve-regulation] notify error:", err),
  );

  return NextResponse.json({ ok: true, regulationId: newReg.id });
}

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import type { Regulation } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// GET /api/regulations
// Returns all active regulations. Optionally filter by category via ?category=
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const supabase = createServerClient();

  let query = supabase
    .from("regulations")
    .select("*")
    .eq("status", "active")
    .order("code", { ascending: true });

  if (category) {
    // Filter rows where applies_to array contains the given category
    query = query.contains("applies_to", [category]);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// ---------------------------------------------------------------------------
// POST /api/regulations
// Creates a new regulation. Requires the service-role key in the Authorization
// header: "Bearer <SUPABASE_SERVICE_ROLE_KEY>"
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  if (!token || token !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Partial<Regulation>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { code, title } = body;
  if (!code || !title) {
    return NextResponse.json(
      { error: "Fields 'code' and 'title' are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("regulations")
    .insert({
      code,
      title,
      summary: body.summary ?? null,
      applies_to: body.applies_to ?? null,
      markets: body.markets ?? null,
      channels: body.channels ?? null,
      certifications: body.certifications ?? null,
      checklist_item_refs: body.checklist_item_refs ?? null,
      official_url: body.official_url ?? null,
      effective_date: body.effective_date ?? null,
      version: body.version ?? 1,
      status: body.status ?? "active",
      ai_confidence_score: body.ai_confidence_score ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

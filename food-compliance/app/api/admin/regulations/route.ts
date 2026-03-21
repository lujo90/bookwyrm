import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/admin/regulations — list all regulations ordered by code
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");

  let query = (supabase as any).from("regulations").select("*").order("code");

  if (code) {
    query = query.eq("code", code);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/regulations — create a new regulation
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check user role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "admin"].includes((profile as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { data, error } = await (supabase as any)
    .from("regulations")
    .insert({
      code:                body.code,
      title:               body.title,
      summary:             body.summary ?? null,
      applies_to:          body.applies_to ?? [],
      markets:             body.markets ?? [],
      channels:            body.channels ?? [],
      certifications:      body.certifications ?? [],
      checklist_item_refs: body.checklist_item_refs ?? [],
      official_url:        body.official_url ?? null,
      effective_date:      body.effective_date ?? null,
      status:              body.status ?? "active",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

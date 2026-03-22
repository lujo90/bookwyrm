import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

  const { id, reason } = (await req.json()) as { id: string; reason: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = supabase as any; // eslint-disable-line

  const { error } = await db
    .from("regulation_review_queue")
    .update({
      status:         "rejected",
      reviewer_notes: reason ?? null,
      reviewed_by:    user.email,
      reviewed_at:    new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

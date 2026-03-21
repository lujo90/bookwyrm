import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/admin/regulations/[id] — fetch single regulation
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await (supabase as any)
    .from("regulations")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

// PATCH /api/admin/regulations/[id] — update regulation + create version record
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "admin"].includes((profile as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabase as any;

  // Get current regulation to capture version
  const { data: current, error: fetchError } = await db
    .from("regulations")
    .select("*")
    .eq("id", params.id)
    .single();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 404 });

  const body = await req.json();
  const newVersion = (current.version ?? 1) + 1;

  // Update the regulation
  const { data: updated, error: updateError } = await db
    .from("regulations")
    .update({
      ...body,
      version: newVersion,
      last_updated: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Create a version history record
  await db.from("regulation_versions").insert({
    regulation_id:      params.id,
    version:            newVersion,
    summary:            updated.summary,
    change_description: body.change_description ?? "Regulation updated",
    changed_by:         (profile as any).email,
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/regulations/[id] — soft delete (set status to superseded)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "admin"].includes((profile as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await (supabase as any)
    .from("regulations")
    .update({ status: "superseded", last_updated: new Date().toISOString() })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/agent-messages
 *
 * Without query params: returns { message: AgentMessage | null }
 *   — the latest unread message for the current org (used by AppShell).
 *
 * With ?productId=xxx&limit=N: returns { messages: AgentMessage[] }
 *   — the last N messages for that product (used by AgentSidebar history).
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: null });

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();

  const orgId = (profileRaw as any)?.organisation_id;
  if (!orgId) return NextResponse.json({ message: null });

  const db = supabase as any; // eslint-disable-line

  const { searchParams } = new URL(req.url);
  const productId        = searchParams.get("productId");
  const limit            = Math.min(parseInt(searchParams.get("limit") ?? "10", 10), 50);

  // ── Product-scoped history (for AgentSidebar) ─────────────────────────────
  if (productId) {
    const { data } = await db
      .from("agent_messages")
      .select("id, message, product_id, trigger_type, read, created_at")
      .eq("organisation_id", orgId)
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Return oldest-first so the sidebar renders them in chronological order
    const messages = ((data ?? []) as unknown[]).reverse();
    return NextResponse.json({ messages });
  }

  // ── Latest unread (for AppShell AgentBar) ─────────────────────────────────
  const { data } = await db
    .from("agent_messages")
    .select("id, message, product_id, trigger_type, created_at")
    .eq("organisation_id", orgId)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ message: data ?? null });
}

/**
 * PATCH /api/agent-messages — marks a message as read
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = (await req.json()) as { id: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = supabase as any; // eslint-disable-line
  await db.from("agent_messages").update({ read: true }).eq("id", id);

  return NextResponse.json({ ok: true });
}

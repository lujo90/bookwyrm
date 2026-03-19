import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/billing/trial-status
// Returns { subscriptionStatus, trialEndsAt, daysLeft } for the current user's org.
export async function GET() {
  const supabase = await createClient();
  const db = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data: org } = await db
    .from("organisations")
    .select("subscription_status, trial_ends_at")
    .eq("id", (profile as any).organisation_id)
    .single();

  if (!org) return NextResponse.json({ error: "Organisation not found" }, { status: 404 });

  const { subscription_status, trial_ends_at } = org;

  let daysLeft: number | null = null;
  if (subscription_status === "trial" && trial_ends_at) {
    const diff = new Date(trial_ends_at).getTime() - Date.now();
    daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return NextResponse.json({
    subscriptionStatus: subscription_status,
    trialEndsAt:        trial_ends_at,
    daysLeft,
  });
}

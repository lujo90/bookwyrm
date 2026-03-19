import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

// POST /api/stripe/create-checkout
// Creates a Stripe Checkout Session and returns { url }.
export async function POST() {
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

  const orgId = (profile as any).organisation_id;

  const { data: org } = await db
    .from("organisations")
    .select("id, name, stripe_customer_id")
    .eq("id", orgId)
    .single();

  if (!org) return NextResponse.json({ error: "Organisation not found" }, { status: 404 });

  let customerId: string = org.stripe_customer_id;

  // Create Stripe customer if one doesn't exist yet
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: (profile as any).email,
      name:  org.name,
      metadata: { organisation_id: orgId },
    });
    customerId = customer.id;
    await db
      .from("organisations")
      .update({ stripe_customer_id: customerId })
      .eq("id", orgId);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode:        "subscription",
    customer:    customerId,
    line_items:  [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${appUrl}/billing/success`,
    cancel_url:  `${appUrl}/billing/cancel`,
  });

  return NextResponse.json({ url: session.url });
}

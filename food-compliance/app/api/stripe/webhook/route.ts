import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

// POST /api/stripe/webhook
// Handles Stripe webhook events. Reads raw body for signature verification.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig     = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = await createClient();
  const db = supabase as any; // eslint-disable-line

  // Helper: look up organisation by stripe_customer_id
  async function getOrgByCustomer(customerId: string) {
    const { data } = await db
      .from("organisations")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();
    return data as { id: string } | null;
  }

  async function writeAuditLog(organisationId: string, actionType: string, description: string, metadata: Record<string, unknown>) {
    await db.from("audit_log").insert({
      organisation_id: organisationId,
      product_id:      null,
      actor_id:        null,
      actor_email:     "stripe-webhook@system",
      action_type:     actionType,
      description,
      resource_type:   "subscription",
      resource_id:     null,
      metadata,
    });
  }

  switch (event.type) {
    case "customer.subscription.created": {
      const sub        = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const org        = await getOrgByCustomer(customerId);
      if (org) {
        await db.from("organisations").update({
          subscription_status:    "active",
          stripe_subscription_id: sub.id,
          plan:                   "pro",
          sku_limit:              20,
        }).eq("id", org.id);
        await writeAuditLog(org.id, "subscription_activated", "Stripe subscription activated — plan upgraded to Pro.", { subscription_id: sub.id });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub        = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const org        = await getOrgByCustomer(customerId);
      if (org) {
        await db.from("organisations").update({
          subscription_status: "cancelled",
          sku_limit:           0,
        }).eq("id", org.id);
        await writeAuditLog(org.id, "subscription_cancelled", "Stripe subscription cancelled.", { subscription_id: sub.id });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice    = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (!customerId) break;
      const org = await getOrgByCustomer(customerId);
      if (org) {
        await db.from("organisations").update({
          subscription_status: "past_due",
        }).eq("id", org.id);
        await writeAuditLog(org.id, "payment_failed", "Stripe invoice payment failed — subscription set to past_due.", { invoice_id: invoice.id });

        // Send email via Resend
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          const { data: orgData } = await db
            .from("organisations")
            .select("name")
            .eq("id", org.id)
            .single();
          // Get org owner email
          const { data: ownerProfile } = await db
            .from("profiles")
            .select("email")
            .eq("organisation_id", org.id)
            .eq("role", "owner")
            .limit(1)
            .maybeSingle();
          if (ownerProfile?.email) {
            await fetch("https://api.resend.com/emails", {
              method:  "POST",
              headers: {
                "Content-Type":  "application/json",
                "Authorization": `Bearer ${resendKey}`,
              },
              body: JSON.stringify({
                from:    "FoodComply <billing@foodcomply.app>",
                to:      [ownerProfile.email],
                subject: "Payment failed — action required",
                html:    `<p>Hi,</p><p>We were unable to process your latest payment for <strong>${orgData?.name ?? "your account"}</strong>. Please update your payment method to keep access to FoodComply.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings">Manage Billing</a></p>`,
              }),
            });
          }
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

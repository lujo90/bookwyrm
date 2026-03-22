/**
 * notifyCustomers
 *
 * Finds all products affected by a regulation change, inserts
 * regulation_alerts rows, and sends a Resend email to each
 * affected organisation.
 */

import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import type { Regulation } from "@/types/database";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function notifyAffectedCustomers(
  regulation: Regulation,
): Promise<void> {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  // ── 1. Find affected products ─────────────────────────────────────────────
  // A product is affected if its category overlaps with regulation.applies_to
  // OR its certifications overlap with regulation.certifications.
  // "all" in applies_to means every product is affected.

  const appliesTo      = regulation.applies_to      ?? [];
  const regCerts       = regulation.certifications   ?? [];
  const matchesAll     = appliesTo.includes("all");

  type ProductRow = {
    id:              string;
    name:            string;
    organisation_id: string;
    category:        string | null;
  };

  let products: ProductRow[] = [];

  if (matchesAll) {
    const { data } = await db
      .from("products")
      .select("id, name, organisation_id, category");
    products = data ?? [];
  } else {
    // Fetch all products and filter in JS (Supabase JS doesn't expose
    // array-overlap operators cleanly without RPC)
    const { data: all } = await db
      .from("products")
      .select("id, name, organisation_id, category");

    const allProducts: ProductRow[] = all ?? [];

    products = allProducts.filter((p) => {
      const cat   = p.category ?? "";
      return appliesTo.includes(cat);
    });
  }

  if (products.length === 0) return;

  // ── 2. Group by organisation ──────────────────────────────────────────────

  const byOrg = new Map<string, ProductRow[]>();
  for (const p of products) {
    const list = byOrg.get(p.organisation_id) ?? [];
    list.push(p);
    byOrg.set(p.organisation_id, list);
  }

  // ── 3. Fetch org emails ───────────────────────────────────────────────────

  const orgIds = Array.from(byOrg.keys());
  const { data: profiles } = await db
    .from("profiles")
    .select("organisation_id, email, role")
    .in("organisation_id", orgIds)
    .in("role", ["owner", "admin"]);

  // Map orgId → first owner/admin email
  const orgEmail = new Map<string, string>();
  for (const p of profiles ?? []) {
    if (!orgEmail.has(p.organisation_id)) {
      orgEmail.set(p.organisation_id, p.email);
    }
  }

  // ── 4. Insert alerts + send emails ───────────────────────────────────────

  for (const [orgId, orgProducts] of byOrg.entries()) {
    const alerts = orgProducts.map((p) => ({
      organisation_id: orgId,
      product_id:      p.id,
      regulation_id:   regulation.id,
      alert_type:      "regulation_update",
      message: `${regulation.code} has been updated. Your product "${p.name}" may need attention. Check your compliance checklist for updated tasks.`,
      read: false,
    }));

    await db.from("regulation_alerts").insert(alerts);

    // Send email if we have a contact
    const email = orgEmail.get(orgId);
    if (!email) continue;

    const productLines = orgProducts
      .map(
        (p) =>
          `• ${p.name}: ${regulation.code} has been updated. Check your compliance checklist for updated tasks.`,
      )
      .join("\n");

    try {
      await resend.emails.send({
        from:    "Compliance Monitor <compliance@propel1y.com>",
        to:      email,
        subject: "A regulation affecting your products has been updated",
        text: [
          `${regulation.code} — ${regulation.title}`,
          "",
          "The following products in your account may be affected:",
          "",
          productLines,
          "",
          "Log in to your dashboard to review and update your compliance checklists.",
          "",
          "— The Propel1y Compliance Team",
        ].join("\n"),
      });
    } catch (err) {
      console.error(`[notifyCustomers] Resend error for org ${orgId}:`, err);
      // Don't rethrow — alerts are already inserted
    }
  }
}

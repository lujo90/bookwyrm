import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { onDocumentExpired } from "@/lib/changes/cascadeHandler";
import type { CascadeResult } from "@/lib/changes/cascadeHandler";

/**
 * POST /api/products/[id]/documents/check-expiry
 *
 * Checks all documents for this product with an expiry_date in the past.
 * For each expired document, triggers onDocumentExpired which resets any
 * linked checklist items and recalculates the readiness score.
 *
 * Designed to be called:
 *   - From the product page server component at load time
 *   - From an external cron job (Supabase Edge Functions / Vercel Cron)
 *
 * Returns:
 *   { expired: number, itemsReset: string[], notifications: string[] }
 */

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const now = new Date().toISOString();

  // Fetch expired documents for this product
  const { data: expiredDocsRaw } = await db
    .from("documents")
    .select("id, name, expiry_date")
    .eq("product_id", params.id)
    .not("expiry_date", "is", null)
    .lt("expiry_date", now);

  const expiredDocs = (expiredDocsRaw ?? []) as { id: string; name: string; expiry_date: string }[];

  if (expiredDocs.length === 0) {
    return NextResponse.json({ expired: 0, itemsReset: [], notifications: [] });
  }

  const allItemsReset:    string[] = [];
  const allNotifications: string[] = [];

  for (const doc of expiredDocs) {
    const result: CascadeResult = await onDocumentExpired(doc.id, db);
    allItemsReset.push(...result.itemsReset);
    allNotifications.push(...result.notifications);
  }

  return NextResponse.json({
    expired:       expiredDocs.length,
    itemsReset:    allItemsReset,
    notifications: allNotifications,
  });
}

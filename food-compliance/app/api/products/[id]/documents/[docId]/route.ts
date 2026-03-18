import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Document } from "@/types/database";

/**
 * DELETE /api/products/[id]/documents/[docId]
 *
 * Removes a document from Supabase Storage and deletes the DB record.
 * RLS ensures the caller can only delete documents in their own organisation.
 */

const BUCKET = "documents";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; docId: string } },
) {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id: productId, docId } = params;

  // Fetch the document record — RLS scopes this to the caller's org automatically
  const { data: docRaw, error: fetchError } = await db
    .from("documents")
    .select("*")
    .eq("id", docId)
    .eq("product_id", productId)
    .single();

  if (fetchError || !docRaw) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const doc = docRaw as Document;

  // Remove the file from storage first (best-effort; don't fail the request if
  // the object is already gone)
  await supabase.storage.from(BUCKET).remove([doc.storage_path]);

  // Delete the DB record
  const { error: deleteError } = await db
    .from("documents")
    .delete()
    .eq("id", docId);

  if (deleteError) {
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }

  // Audit log
  const { data: profileRaw } = await db
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();

  const profile = profileRaw as { organisation_id: string } | null;

  if (profile) {
    await db.from("audit_log").insert({
      organisation_id: profile.organisation_id,
      product_id:      productId,
      actor_id:        user.id,
      actor_email:     user.email ?? "unknown",
      action_type:     "document_deleted",
      description:     `"${doc.name}" deleted`,
      resource_type:   "document",
      resource_id:     docId,
      metadata:        { document_type: doc.type },
    });
  }

  return NextResponse.json({ success: true });
}

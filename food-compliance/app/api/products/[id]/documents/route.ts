import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { onDocumentVersionUploaded } from "@/lib/changes/cascadeHandler";
import type { Document } from "@/types/database";

/**
 * GET  /api/products/[id]/documents
 * Lists all documents for a product, each with a short-lived signed download URL.
 *
 * POST /api/products/[id]/documents
 * Uploads a new document to Supabase Storage and records it in the DB.
 * Body: multipart/form-data  { file: File, type: DocumentType, expiry_date?: string }
 */

const BUCKET        = "documents";
const SIGNED_EXPIRY = 3600; // 1 hour

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: docsRaw, error } = await db
    .from("documents")
    .select("*")
    .eq("product_id", params.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }

  const docs = (docsRaw ?? []) as Document[];

  // Attach a signed URL to each document so the client can download without
  // exposing the raw storage path.
  const docsWithUrls = await Promise.all(
    docs.map(async (doc) => {
      const { data: urlData } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.storage_path, SIGNED_EXPIRY);
      return { ...doc, signed_url: urlData?.signedUrl ?? null };
    }),
  );

  return NextResponse.json({ documents: docsWithUrls });
}

// ─── POST ─────────────────────────────────────────────────────────────────────

const VALID_TYPES = ["spec_sheet", "lab_report", "certificate", "declaration", "label_artwork", "other"] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const db       = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file       = formData.get("file")        as File   | null;
  const type       = formData.get("type")        as string | null;
  const expiryDate = formData.get("expiry_date") as string | null;

  if (!file || !type) {
    return NextResponse.json({ error: "file and type are required" }, { status: 400 });
  }

  if (!VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }

  // Resolve the caller's organisation
  const { data: profileRaw } = await db
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();

  const profile = profileRaw as { organisation_id: string } | null;
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Confirm the product exists (and belongs to this org via RLS)
  const { data: productRaw, error: productError } = await db
    .from("products")
    .select("id")
    .eq("id", params.id)
    .single();

  if (productError || !productRaw) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Build a unique, collision-safe storage path
  const ext         = file.name.split(".").pop() ?? "bin";
  const fileId      = crypto.randomUUID();
  const storagePath = `${profile.organisation_id}/${params.id}/${fileId}.${ext}`;

  // Upload the file bytes to Supabase Storage
  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert:      false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Storage upload failed", detail: uploadError.message },
      { status: 500 },
    );
  }

  // Persist document metadata
  const { data: docRaw, error: insertError } = await db
    .from("documents")
    .insert({
      product_id:      params.id,
      organisation_id: profile.organisation_id,
      name:            file.name,
      type,
      storage_path:    storagePath,
      mime_type:       file.type || "application/octet-stream",
      size_bytes:      file.size,
      expiry_date:     expiryDate || null,
      uploaded_by:     user.id,
    })
    .select("*")
    .single();

  if (insertError || !docRaw) {
    // Best-effort cleanup of the orphaned storage object
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: "Failed to save document record" }, { status: 500 });
  }

  const doc = docRaw as Document;

  // Audit log
  await db.from("audit_log").insert({
    organisation_id: profile.organisation_id,
    product_id:      params.id,
    actor_id:        user.id,
    actor_email:     user.email ?? "unknown",
    action_type:     "document_uploaded",
    description:     `"${file.name}" uploaded`,
    resource_type:   "document",
    resource_id:     doc.id,
    metadata:        { document_type: type, size_bytes: file.size },
  });

  // Include a signed URL in the response so the client can display it immediately
  const { data: urlData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_EXPIRY);

  // Check if this is a replacement for an existing document of the same type.
  // If so, trigger the document-version cascade (resets linked checklist items).
  const { data: existingDocsRaw } = await db
    .from("documents")
    .select("id")
    .eq("product_id", params.id)
    .eq("type", type)
    .neq("id", doc.id)
    .limit(1);

  const isReplacement = ((existingDocsRaw ?? []) as { id: string }[]).length > 0;
  const cascade = isReplacement
    ? await onDocumentVersionUploaded(params.id, type, db, user.email ?? "unknown", user.id)
    : null;

  return NextResponse.json(
    { document: { ...doc, signed_url: urlData?.signedUrl ?? null }, cascade },
    { status: 201 },
  );
}

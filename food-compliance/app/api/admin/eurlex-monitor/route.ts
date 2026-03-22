import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  searchRecentRegulations,
  fetchDocumentText,
  type EurLexDocument,
} from "@/lib/eurlex/client";

export const dynamic = "force-dynamic";
// Allow up to 5 minutes — network + document fetching can be slow
export const maxDuration = 300;

const QUERIES = [
  "EU food labelling regulation 2024 2025",
  "EU food packaging regulation 2024 2025",
  "EU food additives regulation 2024 2025",
  "EU organic food regulation 2024 2025",
];

export async function POST(_req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabase as any; // eslint-disable-line

  let documentsFound   = 0;
  let newDocumentsQueued = 0;
  const errors: string[] = [];

  // ── Fetch existing CELEX numbers to avoid duplicates ──────────────────────

  const [{ data: existingRegs }, { data: existingQueue }] = await Promise.all([
    db.from("regulations").select("official_url"),
    db.from("regulation_review_queue").select("eurlex_celex_number"),
  ]);

  const seenUrls = new Set<string>(
    (existingRegs ?? []).map((r: { official_url: string | null }) => r.official_url ?? ""),
  );
  const seenCelex = new Set<string>(
    (existingQueue ?? []).map((r: { eurlex_celex_number: string | null }) => r.eurlex_celex_number ?? ""),
  );

  // ── Run 4 searches sequentially ───────────────────────────────────────────

  for (const query of QUERIES) {
    let results: EurLexDocument[] = [];

    try {
      results = await searchRecentRegulations(query);
    } catch (err) {
      const msg = `Search failed for "${query}": ${String(err)}`;
      console.error("[eurlex-monitor]", msg);
      errors.push(msg);
      continue;
    }

    documentsFound += results.length;

    for (const doc of results) {
      // Skip if already known
      if (seenCelex.has(doc.celexNumber) || seenUrls.has(doc.url)) continue;

      seenCelex.add(doc.celexNumber);
      seenUrls.add(doc.url);

      let rawText = "";
      try {
        rawText = await fetchDocumentText(doc.celexNumber);
      } catch (err) {
        const msg = `Doc fetch failed for ${doc.celexNumber}: ${String(err)}`;
        console.error("[eurlex-monitor]", msg);
        errors.push(msg);
        // Still queue with empty raw text so admin can review the URL
      }

      const { error: insertErr } = await db
        .from("regulation_review_queue")
        .insert({
          eurlex_celex_number: doc.celexNumber,
          eurlex_document_url: doc.url,
          raw_text:            rawText || null,
          status:              "pending",
          is_new_regulation:   true,
        });

      if (insertErr) {
        const msg = `Insert failed for ${doc.celexNumber}: ${insertErr.message}`;
        console.error("[eurlex-monitor]", msg);
        errors.push(msg);
      } else {
        newDocumentsQueued++;
      }
    }
  }

  // ── Log the job run ───────────────────────────────────────────────────────

  await db.from("monitoring_job_log").insert({
    job_name:         "eurlex-monitor",
    documents_found:  documentsFound,
    documents_queued: newDocumentsQueued,
    error_text:       errors.length > 0 ? errors.join("\n") : null,
  });

  return NextResponse.json({
    queriesRun:           QUERIES.length,
    documentsFound,
    newDocumentsQueued,
    errors,
  });
}

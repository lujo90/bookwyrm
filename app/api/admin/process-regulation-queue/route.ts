import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/server";
import type { AiInterpretation, RegulationReviewQueue } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// System prompt sent to Claude for every regulation document.
// Instructs the model to return a single, strict JSON object.
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a food compliance expert specialising in EU and UK food law.

You will be given the full text of an EU regulation document retrieved from EUR-Lex.
Your task is to read it carefully and return a single JSON object — no markdown, no
explanation, just the raw JSON — with exactly these fields:

{
  "plain_language_summary": "<string: 2-4 sentence plain-English summary>",
  "affected_product_categories": ["<string>", ...],
  "affected_certifications": ["<string>", ...],
  "affected_channels": ["<string>", ...],
  "proposed_checklist_items": ["<string>", ...],
  "is_amendment_of_existing": <boolean>,
  "existing_regulation_code": "<string or null>",
  "confidence_score": <number between 0 and 1>
}

Field guidance:
- affected_product_categories: e.g. "dairy", "meat", "beverages", "bakery", "supplements"
- affected_certifications: e.g. "organic", "vegan", "gluten-free", "fair-trade"
- affected_channels: e.g. "retail", "dtc", "foodservice", "online", "wholesale"
- proposed_checklist_items: concrete, actionable compliance steps for a food brand
- is_amendment_of_existing: true only if the document explicitly amends or repeals another regulation
- existing_regulation_code: the short code (e.g. "EU 1169/2011") of the regulation being amended; null otherwise
- confidence_score: 1.0 = fully clear regulation, 0.0 = unable to determine applicability

Return only the JSON object. Do not wrap it in a code block.`;

// Maximum characters sent to the model per document.
// Keeps token use predictable and avoids context-limit errors.
const MAX_DOCUMENT_CHARS = 60_000;

// Model specified by product requirements.
const MODEL = "claude-sonnet-4-20250514";

// ---------------------------------------------------------------------------
// POST /api/admin/process-regulation-queue
//
// Fetches up to 5 pending items from regulation_review_queue, sends each to
// Claude for structured interpretation, stores the result, and marks the row
// as 'ai_processed'. Items that fail are left as 'pending' so they can be
// retried; the error is returned in the response body.
//
// Auth: requires Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  // ---- Auth check ----
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  if (!token || token !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ---- Initialise clients ----
  const supabase = createServiceClient();

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 500 }
    );
  }
  const anthropic = new Anthropic({ apiKey: anthropicApiKey });

  // ---- Fetch pending queue items ----
  const { data: items, error: fetchError } = await supabase
    .from("regulation_review_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(5);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const queue = (items ?? []) as RegulationReviewQueue[];

  type ItemResult =
    | { id: string; status: "processed" }
    | { id: string; status: "skipped"; reason: string }
    | { id: string; status: "error"; error: string };

  const results: ItemResult[] = [];

  // ---- Process each item individually ----
  for (const item of queue) {
    // Items with no raw text can't be interpreted — skip without changing status
    if (!item.raw_text || item.raw_text.trim() === "") {
      results.push({ id: item.id, status: "skipped", reason: "no raw_text" });
      continue;
    }

    try {
      // ---- Call Claude ----
      const documentSnippet = item.raw_text.slice(0, MAX_DOCUMENT_CHARS);

      const message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content:
              `CELEX: ${item.eurlex_celex_number ?? "unknown"}\n` +
              `URL: ${item.eurlex_document_url ?? "unknown"}\n\n` +
              `REGULATION TEXT:\n${documentSnippet}`,
          },
        ],
      });

      const firstBlock = message.content[0];
      if (firstBlock.type !== "text") {
        throw new Error(
          `Unexpected Claude response content type: ${firstBlock.type}`
        );
      }

      // ---- Parse and validate JSON ----
      let interpretation: AiInterpretation;
      try {
        interpretation = JSON.parse(firstBlock.text) as AiInterpretation;
      } catch {
        throw new Error(
          `Claude returned invalid JSON. First 300 chars: ${firstBlock.text.slice(0, 300)}`
        );
      }

      // Basic shape guard — confidence_score must be a number in [0,1]
      if (
        typeof interpretation.confidence_score !== "number" ||
        interpretation.confidence_score < 0 ||
        interpretation.confidence_score > 1
      ) {
        throw new Error(
          `Invalid confidence_score: ${interpretation.confidence_score}`
        );
      }

      // ---- Persist result ----
      const { error: updateError } = await supabase
        .from("regulation_review_queue")
        .update({
          ai_interpretation: interpretation,
          status: "ai_processed",
        })
        .eq("id", item.id);

      if (updateError) {
        throw new Error(`DB update failed: ${updateError.message}`);
      }

      results.push({ id: item.id, status: "processed" });
    } catch (err) {
      // Log and continue — do NOT update the row status so it can be retried
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[process-regulation-queue] item ${item.id} failed:`, message);
      results.push({ id: item.id, status: "error", error: message });
    }
  }

  // ---- Summary response ----
  const processed = results.filter((r) => r.status === "processed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json(
    {
      total_fetched: queue.length,
      processed,
      skipped,
      errors,
      results,
    },
    { status: errors > 0 && processed === 0 ? 500 : 200 }
  );
}

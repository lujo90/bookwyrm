import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const dynamic  = "force-dynamic";
export const maxDuration = 120; // Claude can take time on long docs

const SYSTEM_PROMPT = `You are a food compliance expert specialising in EU food law. Read the following EU regulation text and return a JSON object with exactly these fields:
{
  "plain_language_summary": "<2-3 sentences explaining what this regulation requires, written for a small food manufacturer with no compliance background>",
  "affected_product_categories": ["<e.g. all, organic, beverages>"],
  "affected_certifications": ["<e.g. organic, halal>"],
  "affected_channels": ["<e.g. retail, dtc>"],
  "proposed_checklist_items": ["<plain-English task titles this regulation would add to a compliance checklist>"],
  "is_amendment_of_existing": <boolean>,
  "existing_regulation_code": "<if this amends an existing regulation, its code e.g. EU 1169/2011, or null>",
  "confidence_score": <number between 0 and 1>
}
Return only valid JSON. No preamble, no explanation, no markdown code blocks.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id } = body as { id: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = supabase as any; // eslint-disable-line

  // Fetch the queue row
  const { data: queueRow, error: fetchErr } = await db
    .from("regulation_review_queue")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !queueRow) {
    return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
  }

  const rawText: string = queueRow.raw_text ?? "";

  if (!rawText.trim()) {
    return NextResponse.json(
      { error: "No raw text available for this queue item — fetch the document first" },
      { status: 422 },
    );
  }

  // ── Call Claude ────────────────────────────────────────────────────────────

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  let interpretation: Record<string, unknown>;

  try {
    const message = await anthropic.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system:     SYSTEM_PROMPT,
      messages: [
        {
          role:    "user",
          content: rawText,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No text in Claude response" }, { status: 500 });
    }

    // Strip any accidental markdown fences
    const cleaned = textBlock.text
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    interpretation = JSON.parse(cleaned);
  } catch (err) {
    console.error("[interpret-regulation] Claude error:", err);
    return NextResponse.json(
      { error: `AI interpretation failed: ${String(err)}` },
      { status: 500 },
    );
  }

  // ── Update the queue row ───────────────────────────────────────────────────

  const { error: updateErr } = await db
    .from("regulation_review_queue")
    .update({
      ai_interpretation: interpretation,
      status:            "ai_processed",
    })
    .eq("id", id);

  if (updateErr) {
    console.error("[interpret-regulation] update error:", updateErr);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json(interpretation);
}

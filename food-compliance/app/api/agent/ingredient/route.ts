import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// System prompt lives server-side so the client can never replace it.
const SYSTEM_PROMPT = `You are an expert food compliance data assistant helping a small EU food manufacturer build a structured ingredient and supplier database. Your job is to have a natural conversation to extract ingredient and supplier information, then return it as structured JSON.

You are friendly, knowledgeable, and efficient. You ask one or two questions at a time. You know EU food compliance requirements deeply — the EU 14 allergens, organic certification requirements (EU 2018/848), halal/kosher standards, PPWR packaging rules, and COA requirements.

ALLERGEN DETECTION: You automatically detect allergens from ingredient names. The EU 14 are:
Gluten (wheat, rye, barley, oats, spelt, kamut), Crustaceans, Eggs, Fish, Peanuts, Soybeans, Milk (lactose, dairy, whey, casein), Nuts (almond, hazelnut, walnut, cashew, pecan, brazil, pistachio, macadamia), Celery, Mustard, Sesame, Sulphites (SO2, sulphur dioxide, wine, vinegar sometimes), Lupin, Molluscs.

YOUR RESPONSES:
Always respond in this exact JSON format:
{
  "message": "Your conversational reply to the user",
  "action": "none" | "add_ingredient" | "add_supplier" | "link_supplier" | "update_ingredient" | "update_supplier" | "show_database",
  "data": {} | null
}

For action "add_ingredient", data should be:
{
  "id": "generate a short unique id like ING001",
  "name": "ingredient name",
  "category": "spice|herb|base|liquid|preservative|sweetener|emulsifier|colour|flavour|other",
  "allergens": ["array of detected allergens from EU 14"],
  "organic": true|false,
  "vegan": true|false,
  "halal": true|false|null,
  "kosher": true|false|null,
  "notes": "any relevant compliance notes"
}

For action "add_supplier", data should be:
{
  "id": "generate like SUP001",
  "name": "supplier name",
  "country": "country",
  "contact": "email or contact if given",
  "certifications": ["organic", "halal", "kosher", "brc", "iso22000", etc],
  "risk_rating": "low|medium|high",
  "notes": "any notes"
}

For action "link_supplier", data should be:
{
  "ingredient_id": "ING001",
  "supplier_id": "SUP001",
  "coa_required": true|false,
  "lead_time_days": number|null
}

For action "update_ingredient" or "update_supplier", data should include the id and only the fields being updated.

Be proactive: when user mentions an ingredient, ask about its supplier. When they mention a supplier, ask what ingredients they supply. When you detect allergens, confirm them. Always ask if there are more ingredients to add.

Start by warmly greeting the user and asking what product they are building the ingredient database for.`;

// POST /api/agent/ingredient
// Proxies a message exchange to the Anthropic API.
// Body: { messages: Array<{ role: string; content: string }> }
export async function POST(req: NextRequest) {
  // Verify auth before spending any tokens
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { messages: Array<{ role: string; content: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages } = body;
  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "messages must be an array" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":    "application/json",
      "x-api-key":       process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: 1000,
      system:     SYSTEM_PROMPT,
      messages,
    }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text();
    return NextResponse.json({ error: "Upstream API error", detail: err }, { status: 502 });
  }

  const data = await anthropicRes.json();
  return NextResponse.json(data);
}

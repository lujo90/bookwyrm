import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSystemPrompt } from "@/lib/agent/buildSystemPrompt";
import { calculateScore } from "@/lib/score/calculateScore";
import type { ChecklistItem, Document } from "@/types/database";

export const dynamic    = "force-dynamic";
export const maxDuration = 60;

// ─── Rate limiting ────────────────────────────────────────────────────────────
// Simple in-memory 24-hour rolling window. Resets on cold start — acceptable for MVP.

const DAILY_LIMIT = 30;
const WINDOW_MS   = 24 * 60 * 60 * 1000; // 24 hours

// Map<userId, timestamps[]>
const rateLimitStore = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now  = Date.now();
  const prev = (rateLimitStore.get(userId) ?? []).filter(
    (ts) => now - ts < WINDOW_MS,
  );
  if (prev.length >= DAILY_LIMIT) return true;
  rateLimitStore.set(userId, [...prev, now]);
  return false;
}

// ─── SSE parser — extracts text chunks from Anthropic streaming response ──────

async function* parseAnthropicSSE(
  readable: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader  = readable.getReader();
  const decoder = new TextDecoder();
  let   buffer  = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") return;
        try {
          const event = JSON.parse(json) as {
            type:  string;
            delta?: { type: string; text: string };
          };
          if (
            event.type === "content_block_delta" &&
            event.delta?.type === "text_delta" &&
            event.delta.text
          ) {
            yield event.delta.text;
          }
        } catch {
          // Malformed SSE line — skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── POST /api/agent ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Rate limit check ──────────────────────────────────────────────────────
  if (isRateLimited(user.id)) {
    const db = supabase as any; // eslint-disable-line
    await db.from("monitoring_job_log").insert({
      job_name:         "agent_rate_limit",
      documents_found:  0,
      documents_queued: 0,
      error_text:       `Rate limit hit for user ${user.id}`,
    }).catch(() => {});

    return NextResponse.json(
      { error: "Daily limit reached. The AI advisor resets tomorrow." },
      { status: 429 },
    );
  }

  const db = supabase as any; // eslint-disable-line

  let body: {
    message:             string;
    productId:           string | null;
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
    stream:              boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    message,
    productId,
    conversationHistory = [],
    stream = false,
  } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // ── Fetch product context if productId provided ───────────────────────────
  let productContext = null;

  if (productId) {
    const [productRes, checklistRes, documentsRes, alertsRes] =
      await Promise.all([
        db.from("products").select("*").eq("id", productId).single(),
        db.from("checklist_items").select("*").eq("product_id", productId),
        db.from("documents").select("*").eq("product_id", productId),
        db.from("regulation_alerts")
          .select("message")
          .eq("product_id", productId)
          .eq("read", false),
      ]);

    const product       = productRes.data;
    const checklistItems: ChecklistItem[] = checklistRes.data ?? [];
    const documents:      Document[]      = documentsRes.data ?? [];
    const alerts                          = alertsRes.data ?? [];

    if (product) {
      const scoreResult = calculateScore(checklistItems);
      productContext = {
        id:               product.id,
        name:             product.name,
        category:         product.category ?? null,
        readiness_score:  product.readiness_score ?? 0,
        milestoneMessage: scoreResult.milestoneMessage,
        checklistItems,
        documents,
        regulationAlerts: alerts,
      };
    }
  }

  // ── Build system prompt ───────────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(productContext);

  // ── Build Anthropic messages ──────────────────────────────────────────────
  const anthropicMessages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...conversationHistory,
    { role: "user", content: message },
  ];

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI service not configured." },
      { status: 503 },
    );
  }

  // ── Audit log (fire-and-forget — runs before response so it works for both
  //    streaming and non-streaming paths) ────────────────────────────────────
  void (async () => {
    try {
      const { data: profileRaw } = await supabase
        .from("profiles")
        .select("organisation_id")
        .eq("id", user.id)
        .single();
      const orgId = (profileRaw as any)?.organisation_id ?? null;
      if (!orgId) return;
      await db.from("audit_log").insert({
        organisation_id: orgId,
        product_id:      productId ?? null,
        actor_id:        user.id,
        actor_email:     user.email ?? "unknown",
        action_type:     "agent_interaction",
        description:     message.slice(0, 100),
        resource_type:   "agent",
        resource_id:     null,
      });
    } catch {
      // Non-fatal — audit log failure should not block the response
    }
  })();

  // ── Streaming path ────────────────────────────────────────────────────────
  if (stream) {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 2000,
        stream:     true,
        system:     systemPrompt,
        messages:   anthropicMessages,
      }),
    });

    if (!anthropicRes.ok || !anthropicRes.body) {
      return NextResponse.json(
        { error: "AI service temporarily unavailable. Please try again in a moment." },
        { status: 503 },
      );
    }

    const encoder     = new TextEncoder();
    const sourceBody  = anthropicRes.body;

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const text of parseAnthropicSSE(sourceBody)) {
            controller.enqueue(encoder.encode(text));
          }
        } catch {
          // Stream error — close gracefully
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // ── Non-streaming path ────────────────────────────────────────────────────
  let reply: string;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 2000,
        system:     systemPrompt,
        messages:   anthropicMessages,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };
    const block = data.content?.find((b) => b.type === "text");
    reply = block?.text ?? "I could not generate a response. Please try again.";
  } catch (err) {
    console.error("[agent] Anthropic error:", err);
    return NextResponse.json(
      { error: "AI service temporarily unavailable. Please try again in a moment." },
      { status: 503 },
    );
  }

  return NextResponse.json({ reply });
}

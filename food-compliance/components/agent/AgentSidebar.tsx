"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Send,
  X,
  ChevronUp,
  ChevronDown,
  FileDown,
  FileText,
  Bot,
  MoreHorizontal,
} from "lucide-react";
import {
  WHAT_IS_BLOCKING,
  DRAFT_ALLERGEN_STATEMENT,
  CHECK_MY_LABEL,
  DRAFT_PRODUCT_SPEC,
  DRAFT_HACCP_SUMMARY,
  TRACEABILITY_REPORT,
  EXPLAIN_REGULATION,
} from "@/lib/agent/onDemandPrompts";
import type { AgentMessage } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role:    "user" | "assistant";
  content: string;
  /** If true, show a Save as Draft button below this message */
  draftInfo?: DraftInfo | null;
  /** Once saved, record the saved document id */
  savedDocId?: string | null;
}

interface DraftInfo {
  docType:     string;   // DocumentType value
  displayName: string;   // Human-readable type label
}

interface AgentSidebarProps {
  productId:   string;
  productName: string;
}

// ─── Document draft detection ─────────────────────────────────────────────────

const DRAFT_PATTERNS: Array<{ keyword: string; docType: string; displayName: string }> = [
  { keyword: "ALLERGEN STATEMENT",      docType: "declaration", displayName: "Allergen Statement"      },
  { keyword: "PRODUCT SPECIFICATION",   docType: "spec_sheet",  displayName: "Product Specification"   },
  { keyword: "HACCP",                   docType: "other",       displayName: "HACCP Summary"            },
  { keyword: "NUTRITIONAL DECLARATION", docType: "declaration", displayName: "Nutritional Declaration" },
  { keyword: "TRACEABILITY REPORT",     docType: "other",       displayName: "Traceability Report"     },
];

function detectDraft(text: string): DraftInfo | null {
  for (const p of DRAFT_PATTERNS) {
    if (text.toUpperCase().includes(p.keyword)) {
      return { docType: p.docType, displayName: p.displayName };
    }
  }
  return null;
}

// ─── AgentSidebar ─────────────────────────────────────────────────────────────

export default function AgentSidebar({ productId, productName }: AgentSidebarProps) {
  // Layout state
  const [isDesktop, setIsDesktop]         = useState(false);
  const [mobileOpen, setMobileOpen]       = useState(false);

  // Conversation state
  const [messages, setMessages]           = useState<Message[]>([]);
  const [streamText, setStreamText]       = useState("");
  const [streaming, setStreaming]         = useState(false);
  const [input, setInput]                 = useState("");
  const [sending, setSending]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  // "More" quick actions toggle
  const [showMore, setShowMore]           = useState(false);

  // Explain a regulation sub-state
  const [showRegInput, setShowRegInput]   = useState(false);
  const [regCode, setRegCode]             = useState("");

  // Saving drafts
  const [savingIdx, setSavingIdx]         = useState<number | null>(null);

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);
  const abortRef        = useRef<AbortController | null>(null);

  // ── Detect desktop vs mobile ───────────────────────────────────────────────
  useEffect(() => {
    function check() { setIsDesktop(window.innerWidth >= 768); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Load historical agent_messages on mount ────────────────────────────────
  useEffect(() => {
    fetch(`/api/agent-messages?productId=${productId}&limit=10`)
      .then((r) => r.json())
      .then((data: { messages?: AgentMessage[] }) => {
        const historical = (data.messages ?? []).map((m) => ({
          role:    "assistant" as const,
          content: m.message,
        }));
        setMessages(historical);
      })
      .catch(() => {/* Non-fatal — start with empty history */});
  }, [productId]);

  // ── Scroll to bottom whenever messages / stream changes ───────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  // ── Send a message ────────────────────────────────────────────────────────
  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending || streaming) return;

    setError(null);
    setSending(true);
    setShowMore(false);
    setShowRegInput(false);
    setRegCode("");

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStreaming(true);
    setStreamText("");
    setSending(false);

    let fullText = "";

    try {
      const res = await fetch("/api/agent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        signal:  ctrl.signal,
        body:    JSON.stringify({
          message:             trimmed,
          productId,
          conversationHistory: history,
          stream:              true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Request failed");
      }

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setStreamText(fullText);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      setStreamText("");
      setMessages((prev) => prev.slice(0, -1)); // Remove the user message on error
      setStreaming(false);
      return;
    }

    setStreaming(false);
    setStreamText("");

    const draftInfo = detectDraft(fullText);
    const assistantMsg: Message = {
      role:      "assistant",
      content:   fullText,
      draftInfo: draftInfo,
    };
    setMessages((prev) => [...prev, assistantMsg]);
  }, [messages, productId, sending, streaming]);

  // ── Handle form submit ────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  // ── Handle keyboard shortcut (Cmd/Ctrl+Enter) ─────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      send(input);
    }
  }

  // ── Save draft ────────────────────────────────────────────────────────────
  async function saveDraft(msgIdx: number) {
    const msg = messages[msgIdx];
    if (!msg?.draftInfo) return;

    setSavingIdx(msgIdx);

    try {
      const date  = new Date().toISOString().split("T")[0];
      const fname = `${msg.draftInfo.displayName} - AI Draft ${date}.txt`;
      const blob  = new Blob([msg.content], { type: "text/plain" });
      const file  = new File([blob], fname, { type: "text/plain" });

      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", msg.draftInfo.docType);

      const res = await fetch(`/api/products/${productId}/documents`, {
        method: "POST",
        body:   fd,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json() as { document?: { id: string } };
      const docId = data.document?.id ?? null;

      setMessages((prev) =>
        prev.map((m, i) =>
          i === msgIdx ? { ...m, savedDocId: docId ?? "saved" } : m,
        ),
      );
    } catch {
      setError("Could not save draft. Please try again.");
    } finally {
      setSavingIdx(null);
    }
  }

  // ── Sidebar content ───────────────────────────────────────────────────────
  const sidebarContent = (
    <div
      style={{
        display:       "flex",
        flexDirection: "column",
        height:        "100%",
        overflow:      "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding:      "12px 16px",
          borderBottom: "1px solid #E2E8F0",
          flexShrink:   0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width:           28,
              height:          28,
              borderRadius:    "50%",
              backgroundColor: "#2563EB",
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              flexShrink:      0,
            }}
          >
            <Bot size={14} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize:     13,
                fontWeight:   700,
                color:        "#1E293B",
                margin:       0,
                fontFamily:   "var(--font-body), DM Sans, sans-serif",
              }}
            >
              AI Advisor
            </p>
            <p
              style={{
                fontSize:     11,
                color:        "#94A3B8",
                margin:       0,
                overflow:     "hidden",
                textOverflow: "ellipsis",
                whiteSpace:   "nowrap",
                fontFamily:   "var(--font-body), DM Sans, sans-serif",
              }}
            >
              {productName}
            </p>
          </div>
          {!isDesktop && (
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                background: "none",
                border:     "none",
                cursor:     "pointer",
                color:      "#94A3B8",
                display:    "flex",
                padding:    4,
              }}
              aria-label="Close advisor"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Quick action buttons */}
      <div
        style={{
          padding:      "8px 12px",
          borderBottom: "1px solid #E2E8F0",
          flexShrink:   0,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <QuickBtn label="What is blocking me"      onClick={() => send(WHAT_IS_BLOCKING)}        />
          <QuickBtn label="Draft allergen statement" onClick={() => send(DRAFT_ALLERGEN_STATEMENT)} />
          <QuickBtn label="Check my label"           onClick={() => send(CHECK_MY_LABEL)}          />
          <QuickBtn label="Draft product spec"       onClick={() => send(DRAFT_PRODUCT_SPEC)}      />
          <button
            onClick={() => { setShowMore((v) => !v); setShowRegInput(false); }}
            style={{
              display:         "inline-flex",
              alignItems:      "center",
              gap:             4,
              fontSize:        11,
              fontWeight:      600,
              color:           "#64748B",
              backgroundColor: "#F1F5F9",
              border:          "1px solid #E2E8F0",
              borderRadius:    6,
              padding:         "4px 8px",
              cursor:          "pointer",
              fontFamily:      "var(--font-body), DM Sans, sans-serif",
            }}
          >
            <MoreHorizontal size={11} />
            More
          </button>
        </div>

        {/* More actions */}
        {showMore && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            <QuickBtn label="Draft HACCP summary"   onClick={() => send(DRAFT_HACCP_SUMMARY)}  />
            <QuickBtn label="Traceability report"   onClick={() => send(TRACEABILITY_REPORT)} />
            <button
              onClick={() => { setShowRegInput((v) => !v); }}
              style={{
                display:         "inline-flex",
                alignItems:      "center",
                gap:             4,
                fontSize:        11,
                fontWeight:      600,
                color:           "#2563EB",
                backgroundColor: "#EFF6FF",
                border:          "1px solid #BFDBFE",
                borderRadius:    6,
                padding:         "4px 8px",
                cursor:          "pointer",
                fontFamily:      "var(--font-body), DM Sans, sans-serif",
              }}
            >
              Explain a regulation
            </button>
          </div>
        )}

        {/* Regulation code input */}
        {showRegInput && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (regCode.trim()) send(EXPLAIN_REGULATION(regCode.trim()));
            }}
            style={{ display: "flex", gap: 6, marginTop: 6 }}
          >
            <input
              type="text"
              value={regCode}
              onChange={(e) => setRegCode(e.target.value)}
              placeholder="e.g. EU 1169/2011"
              autoFocus
              style={{
                flex:         1,
                fontSize:     12,
                padding:      "5px 8px",
                border:       "1px solid #CBD5E1",
                borderRadius: 6,
                fontFamily:   "var(--font-body), DM Sans, sans-serif",
                outline:      "none",
              }}
            />
            <button
              type="submit"
              disabled={!regCode.trim()}
              style={{
                fontSize:        11,
                fontWeight:      600,
                color:           "white",
                backgroundColor: "#2563EB",
                border:          "none",
                borderRadius:    6,
                padding:         "5px 10px",
                cursor:          regCode.trim() ? "pointer" : "not-allowed",
                opacity:         regCode.trim() ? 1 : 0.5,
                fontFamily:      "var(--font-body), DM Sans, sans-serif",
              }}
            >
              Ask
            </button>
          </form>
        )}
      </div>

      {/* Message history */}
      <div
        style={{
          flex:       1,
          overflowY:  "auto",
          padding:    "12px 12px 0",
        }}
      >
        {messages.length === 0 && !streaming && (
          <p
            style={{
              fontSize:   12,
              color:      "#94A3B8",
              textAlign:  "center",
              marginTop:  24,
              fontFamily: "var(--font-body), DM Sans, sans-serif",
              lineHeight: 1.5,
            }}
          >
            Ask me anything about this product&apos;s compliance, or use a quick action above.
          </p>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <MessageBubble message={msg} />
            {/* Save as Draft button */}
            {msg.role === "assistant" && msg.draftInfo && !msg.savedDocId && (
              <div style={{ marginTop: 6 }}>
                <button
                  onClick={() => saveDraft(i)}
                  disabled={savingIdx === i}
                  style={{
                    display:         "inline-flex",
                    alignItems:      "center",
                    gap:             5,
                    fontSize:        11,
                    fontWeight:      600,
                    color:           "#7C3AED",
                    backgroundColor: "#F5F3FF",
                    border:          "1px solid #DDD6FE",
                    borderRadius:    6,
                    padding:         "5px 10px",
                    cursor:          savingIdx === i ? "not-allowed" : "pointer",
                    opacity:         savingIdx === i ? 0.6 : 1,
                    fontFamily:      "var(--font-body), DM Sans, sans-serif",
                  }}
                >
                  <FileDown size={12} />
                  {savingIdx === i ? "Saving…" : "Save as Draft"}
                </button>
              </div>
            )}
            {/* View Document button after save */}
            {msg.role === "assistant" && msg.savedDocId && (
              <div style={{ marginTop: 6 }}>
                <a
                  href={`/products/${productId}`}
                  style={{
                    display:         "inline-flex",
                    alignItems:      "center",
                    gap:             5,
                    fontSize:        11,
                    fontWeight:      600,
                    color:           "#16A34A",
                    backgroundColor: "#F0FDF4",
                    border:          "1px solid #BBF7D0",
                    borderRadius:    6,
                    padding:         "5px 10px",
                    textDecoration:  "none",
                    fontFamily:      "var(--font-body), DM Sans, sans-serif",
                  }}
                >
                  <FileText size={12} />
                  Saved as draft — View Documents tab
                </a>
              </div>
            )}
          </div>
        ))}

        {/* Streaming message */}
        {streaming && (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                backgroundColor: "#F8FAFC",
                borderRadius:    10,
                padding:         "8px 10px",
                border:          "1px solid #E2E8F0",
              }}
            >
              <p
                style={{
                  fontSize:   12,
                  color:      "#334155",
                  lineHeight: 1.6,
                  margin:     0,
                  whiteSpace: "pre-wrap",
                  fontFamily: "var(--font-body), DM Sans, sans-serif",
                }}
              >
                {streamText || <span style={{ color: "#94A3B8" }}>Thinking…</span>}
                {/* Blinking cursor */}
                <span
                  style={{
                    display:        "inline-block",
                    width:          2,
                    height:         12,
                    backgroundColor: "#2563EB",
                    marginLeft:     1,
                    verticalAlign:  "middle",
                    animation:      "sidebar-blink 1s step-end infinite",
                  }}
                />
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              backgroundColor: "#FEF2F2",
              border:          "1px solid #FECACA",
              borderRadius:    8,
              padding:         "8px 12px",
              marginBottom:    12,
            }}
          >
            <p
              style={{
                fontSize:   12,
                color:      "#DC2626",
                margin:     0,
                fontFamily: "var(--font-body), DM Sans, sans-serif",
              }}
            >
              {error}
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Text input */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding:      "10px 12px",
          borderTop:    "1px solid #E2E8F0",
          display:      "flex",
          gap:          8,
          alignItems:   "flex-end",
          flexShrink:   0,
          backgroundColor: "white",
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything…"
          rows={2}
          style={{
            flex:        1,
            fontSize:    13,
            padding:     "7px 10px",
            border:      "1px solid #CBD5E1",
            borderRadius: 8,
            resize:      "none",
            fontFamily:  "var(--font-body), DM Sans, sans-serif",
            lineHeight:  1.5,
            outline:     "none",
            color:       "#1E293B",
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending || streaming}
          aria-label="Send"
          style={{
            width:           36,
            height:          36,
            borderRadius:    "50%",
            backgroundColor: input.trim() && !sending && !streaming ? "#2563EB" : "#E2E8F0",
            border:          "none",
            cursor:          input.trim() && !sending && !streaming ? "pointer" : "not-allowed",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            flexShrink:      0,
            transition:      "background-color 0.15s",
          }}
        >
          <Send
            size={15}
            color={input.trim() && !sending && !streaming ? "white" : "#94A3B8"}
          />
        </button>
      </form>

      {/* Blink keyframe */}
      <style>{`
        @keyframes sidebar-blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  );

  // ── Desktop: fixed right panel ────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div
        style={{
          position:        "fixed",
          top:             44,   // AgentBar height
          bottom:          60,   // BottomNav height
          right:           0,
          width:           320,
          backgroundColor: "white",
          borderLeft:      "1px solid #E2E8F0",
          zIndex:          45,
          display:         "flex",
          flexDirection:   "column",
        }}
      >
        {sidebarContent}
      </div>
    );
  }

  // ── Mobile: bottom sheet ──────────────────────────────────────────────────
  return (
    <>
      {/* Toggle tab — sits above the bottom nav */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open AI advisor"
          style={{
            position:        "fixed",
            bottom:          68,   // above 60px nav + a little gap
            right:           16,
            backgroundColor: "#2563EB",
            color:           "white",
            border:          "none",
            borderRadius:    "50%",
            width:           44,
            height:          44,
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            cursor:          "pointer",
            boxShadow:       "0 4px 12px rgba(37,99,235,0.4)",
            zIndex:          45,
          }}
        >
          <Bot size={20} />
        </button>
      )}

      {/* Bottom sheet overlay */}
      {mobileOpen && (
        <>
          {/* Scrim */}
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position:        "fixed",
              inset:           0,
              backgroundColor: "rgba(0,0,0,0.3)",
              zIndex:          44,
            }}
          />
          {/* Sheet */}
          <div
            style={{
              position:        "fixed",
              bottom:          60,   // above bottom nav
              left:            0,
              right:           0,
              height:          "62vh",
              backgroundColor: "white",
              borderRadius:    "16px 16px 0 0",
              zIndex:          45,
              display:         "flex",
              flexDirection:   "column",
              boxShadow:       "0 -4px 24px rgba(0,0,0,0.12)",
            }}
          >
            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 8, paddingBottom: 4 }}>
              <div
                style={{
                  width:           40,
                  height:          4,
                  borderRadius:    2,
                  backgroundColor: "#CBD5E1",
                }}
              />
            </div>
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
}

// ─── QuickBtn ──────────────────────────────────────────────────────────────────

function QuickBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display:         "inline-flex",
        alignItems:      "center",
        fontSize:        11,
        fontWeight:      600,
        color:           "#2563EB",
        backgroundColor: "#EFF6FF",
        border:          "1px solid #BFDBFE",
        borderRadius:    6,
        padding:         "4px 8px",
        cursor:          "pointer",
        fontFamily:      "var(--font-body), DM Sans, sans-serif",
        whiteSpace:      "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// ─── MessageBubble ─────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div
      style={{
        display:       "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
      }}
    >
      <div
        style={{
          maxWidth:        "88%",
          backgroundColor: isUser ? "#2563EB" : "#F8FAFC",
          color:           isUser ? "white" : "#334155",
          borderRadius:    isUser ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
          padding:         "8px 10px",
          border:          isUser ? "none" : "1px solid #E2E8F0",
        }}
      >
        <p
          style={{
            fontSize:   12,
            lineHeight: 1.6,
            margin:     0,
            whiteSpace: "pre-wrap",
            fontFamily: "var(--font-body), DM Sans, sans-serif",
          }}
        >
          {message.content}
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { RegulationReviewQueue } from "@/types/database";

const FONT = "var(--font-body), DM Sans, sans-serif";

// ─── AI interpretation shape returned by Claude ───────────────────────────────

interface AiInterpretation {
  plain_language_summary:      string;
  affected_product_categories: string[];
  affected_certifications:     string[];
  affected_channels:           string[];
  proposed_checklist_items:    string[];
  is_amendment_of_existing:    boolean;
  existing_regulation_code:    string | null;
  confidence_score:            number;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ label, color = "#2563EB", bg = "#EFF6FF", border = "#BFDBFE" }: {
  label: string; color?: string; bg?: string; border?: string;
}) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 12,
      fontSize: 11, fontWeight: 600, fontFamily: FONT,
      backgroundColor: bg, color, border: `1px solid ${border}`,
      marginRight: 4, marginBottom: 4,
    }}>
      {label}
    </span>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  const pct  = Math.round(score * 100);
  const color = score >= 0.7 ? "#16A34A" : score >= 0.5 ? "#D97706" : "#DC2626";
  const bg    = score >= 0.7 ? "#F0FDF4" : score >= 0.5 ? "#FFFBEB" : "#FEF2F2";
  const border= score >= 0.7 ? "#BBF7D0" : score >= 0.5 ? "#FDE68A" : "#FECACA";
  return <Badge label={`${pct}% confidence`} color={color} bg={bg} border={border} />;
}

function MonitorResult({ result }: { result: Record<string, unknown> }) {
  return (
    <div style={{ padding: "12px 16px", backgroundColor: "#F0FDF4", borderRadius: 8, border: "1px solid #BBF7D0", fontSize: 13, fontFamily: FONT }}>
      <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#16A34A" }}>Monitoring job complete</p>
      <p style={{ margin: 0, color: "#475569" }}>
        {String(result.queriesRun ?? 0)} queries · {String(result.documentsFound ?? 0)} documents found · {String(result.newDocumentsQueued ?? 0)} newly queued
      </p>
      {Array.isArray(result.errors) && result.errors.length > 0 && (
        <p style={{ margin: "6px 0 0", color: "#DC2626" }}>
          {result.errors.length} error(s) — check server logs
        </p>
      )}
    </div>
  );
}

// ─── Queue item card ──────────────────────────────────────────────────────────

function QueueItemCard({
  item,
  onInterpreted,
  onApproved,
  onRejected,
}: {
  item:          RegulationReviewQueue;
  onInterpreted: (id: string, interp: AiInterpretation) => void;
  onApproved:    (id: string) => void;
  onRejected:    (id: string) => void;
}) {
  const [running,       setRunning]       = useState(false);
  const [approving,     setApproving]     = useState(false);
  const [rejecting,     setRejecting]     = useState(false);
  const [rejectReason,  setRejectReason]  = useState("");
  const [showReject,    setShowReject]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const ai = item.ai_interpretation as AiInterpretation | null;
  const confidence = ai?.confidence_score ?? null;
  const lowConfidence = confidence !== null && confidence < 0.7;

  async function runInterpretation() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/interpret-regulation", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: item.id }),
      });
      if (!res.ok) {
        const b = await res.json();
        setError(b.error ?? "Failed");
      } else {
        const interp = await res.json();
        onInterpreted(item.id, interp);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/approve-regulation", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: item.id }),
      });
      if (!res.ok) {
        const b = await res.json();
        setError(b.error ?? "Failed to approve");
      } else {
        onApproved(item.id);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) { setError("Rejection reason required"); return; }
    setRejecting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reject-regulation", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: item.id, reason: rejectReason }),
      });
      if (!res.ok) {
        const b = await res.json();
        setError(b.error ?? "Failed to reject");
      } else {
        onRejected(item.id);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setRejecting(false);
    }
  }

  return (
    <div style={{
      backgroundColor: "white", borderRadius: 12, border: "1px solid #E2E8F0",
      padding: 20, display: "flex", flexDirection: "column", gap: 14,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#64748B", fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {item.eurlex_celex_number ?? "Unknown CELEX"}
          </p>
          {item.eurlex_document_url && (
            <a
              href={item.eurlex_document_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: "#2563EB", fontFamily: FONT, wordBreak: "break-all" }}
            >
              {item.eurlex_document_url}
            </a>
          )}
        </div>
        <span style={{
          flexShrink: 0, fontSize: 11, fontWeight: 600, fontFamily: FONT,
          padding: "3px 10px", borderRadius: 12,
          backgroundColor: item.status === "ai_processed" ? "#F0FDF4" : "#FFFBEB",
          color:           item.status === "ai_processed" ? "#16A34A" : "#D97706",
          border:          `1px solid ${item.status === "ai_processed" ? "#BBF7D0" : "#FDE68A"}`,
        }}>
          {item.status}
        </span>
      </div>

      {/* Raw text */}
      {item.raw_text && (
        <div>
          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748B", fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Raw Document Text
          </p>
          <div style={{
            maxHeight: 200, overflowY: "auto", padding: "10px 12px",
            backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0",
            borderRadius: 8, fontSize: 12, color: "#475569",
            fontFamily: "monospace", lineHeight: 1.6, whiteSpace: "pre-wrap",
          }}>
            {item.raw_text}
          </div>
        </div>
      )}

      {/* AI interpretation */}
      {item.status === "ai_processed" && ai && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Low confidence warning */}
          {lowConfidence && (
            <div style={{
              padding: "10px 14px", backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA", borderRadius: 8,
              fontSize: 13, fontWeight: 600, color: "#DC2626", fontFamily: FONT,
            }}>
              ⚠ Low confidence — manual review required before publishing
            </div>
          )}

          {/* Summary */}
          <div style={{
            padding: "12px 14px", backgroundColor: "#EFF6FF",
            border: "1px solid #BFDBFE", borderRadius: 8,
          }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#2563EB", fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Plain Language Summary
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#1E293B", fontFamily: FONT, lineHeight: 1.6 }}>
              {ai.plain_language_summary}
            </p>
          </div>

          {/* Badges row */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ai.affected_product_categories?.length > 0 && (
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#64748B", fontFamily: FONT }}>Product categories</p>
                <div>{ai.affected_product_categories.map((c) => <Badge key={c} label={c} />)}</div>
              </div>
            )}
            {ai.affected_certifications?.length > 0 && (
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#64748B", fontFamily: FONT }}>Certifications</p>
                <div>{ai.affected_certifications.map((c) => <Badge key={c} label={c} color="#7C3AED" bg="#F5F3FF" border="#DDD6FE" />)}</div>
              </div>
            )}
            {ai.affected_channels?.length > 0 && (
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#64748B", fontFamily: FONT }}>Channels</p>
                <div>{ai.affected_channels.map((c) => <Badge key={c} label={c} color="#0369A1" bg="#F0F9FF" border="#BAE6FD" />)}</div>
              </div>
            )}
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#64748B", fontFamily: FONT }}>Confidence</p>
              <ConfidenceBadge score={ai.confidence_score} />
              {ai.is_amendment_of_existing && ai.existing_regulation_code && (
                <Badge label={`Amends ${ai.existing_regulation_code}`} color="#92400E" bg="#FFFBEB" border="#FDE68A" />
              )}
            </div>
          </div>

          {/* Proposed checklist items */}
          {ai.proposed_checklist_items?.length > 0 && (
            <div>
              <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#64748B", fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Proposed Checklist Items
              </p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {ai.proposed_checklist_items.map((item, i) => (
                  <li key={i} style={{ fontSize: 13, color: "#1E293B", fontFamily: FONT, marginBottom: 4, lineHeight: 1.5 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <button
              onClick={handleApprove}
              disabled={approving}
              style={{
                padding: "8px 16px", backgroundColor: approving ? "#D1FAE5" : "#16A34A",
                color: "white", border: "none", borderRadius: 8,
                fontSize: 13, fontWeight: 600, fontFamily: FONT,
                cursor: approving ? "not-allowed" : "pointer",
              }}
            >
              {approving ? "Approving…" : "Approve as Written"}
            </button>
            <button
              onClick={() => { setShowReject(true); setError(null); }}
              style={{
                padding: "8px 16px", backgroundColor: "#FEF2F2",
                color: "#DC2626", border: "1px solid #FECACA", borderRadius: 8,
                fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: "pointer",
              }}
            >
              Reject
            </button>
          </div>

          {/* Reject reason input */}
          {showReject && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Rejection reason (required)…"
                rows={2}
                style={{
                  width: "100%", padding: "8px 12px", border: "1px solid #E2E8F0",
                  borderRadius: 8, fontSize: 13, fontFamily: FONT,
                  color: "#1E293B", resize: "vertical",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleReject}
                  disabled={rejecting}
                  style={{
                    padding: "6px 14px", backgroundColor: "#DC2626", color: "white",
                    border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    fontFamily: FONT, cursor: rejecting ? "not-allowed" : "pointer",
                  }}
                >
                  {rejecting ? "Rejecting…" : "Confirm Reject"}
                </button>
                <button
                  onClick={() => { setShowReject(false); setError(null); }}
                  style={{
                    padding: "6px 14px", backgroundColor: "#F8FAFC", color: "#475569",
                    border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13,
                    fontWeight: 600, fontFamily: FONT, cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending: run AI button */}
      {item.status === "pending" && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={runInterpretation}
            disabled={running}
            style={{
              padding: "8px 16px",
              backgroundColor: running ? "#93C5FD" : "#2563EB",
              color: "white", border: "none", borderRadius: 8,
              fontSize: 13, fontWeight: 600, fontFamily: FONT,
              cursor: running ? "not-allowed" : "pointer",
            }}
          >
            {running ? "Running AI…" : "Run AI Interpretation"}
          </button>
          {running && (
            <span style={{ fontSize: 12, color: "#64748B", fontFamily: FONT }}>
              This may take 20–40 seconds…
            </span>
          )}
        </div>
      )}

      {error && (
        <p style={{ margin: 0, fontSize: 13, color: "#DC2626", fontFamily: FONT }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Main page client ─────────────────────────────────────────────────────────

export default function RegulationReviewClient({
  initialItems,
}: {
  initialItems: RegulationReviewQueue[];
}) {
  const [items,          setItems]          = useState(initialItems);
  const [monitorRunning, setMonitorRunning] = useState(false);
  const [monitorResult,  setMonitorResult]  = useState<Record<string, unknown> | null>(null);
  const [monitorError,   setMonitorError]   = useState<string | null>(null);

  async function runMonitor() {
    setMonitorRunning(true);
    setMonitorResult(null);
    setMonitorError(null);
    try {
      const res = await fetch("/api/admin/eurlex-monitor", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMonitorError(data.error ?? "Monitor job failed");
      } else {
        setMonitorResult(data);
        // Refresh the page data by reloading
        window.location.reload();
      }
    } catch (e) {
      setMonitorError(String(e));
    } finally {
      setMonitorRunning(false);
    }
  }

  function handleInterpreted(id: string, interp: AiInterpretation) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, ai_interpretation: interp as any, status: "ai_processed" }
          : item,
      ),
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  const pendingCount     = items.filter((i) => i.status === "pending").length;
  const processedCount   = items.filter((i) => i.status === "ai_processed").length;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC" }}>
      {/* Header */}
      <div style={{
        backgroundColor: "white", borderBottom: "1px solid #E2E8F0",
        padding: "16px 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1E293B", fontFamily: FONT }}>
            Regulation Review Queue
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748B", fontFamily: FONT }}>
            {pendingCount} pending · {processedCount} awaiting approval
          </p>
        </div>
        <button
          onClick={runMonitor}
          disabled={monitorRunning}
          style={{
            padding: "10px 20px",
            backgroundColor: monitorRunning ? "#93C5FD" : "#2563EB",
            color: "white", border: "none", borderRadius: 8,
            fontSize: 13, fontWeight: 600, fontFamily: FONT,
            cursor: monitorRunning ? "not-allowed" : "pointer",
          }}
        >
          {monitorRunning ? "Running monitor…" : "Run EUR-Lex Monitoring Job"}
        </button>
      </div>

      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, maxWidth: 860, margin: "0 auto" }}>
        {/* Monitor results */}
        {monitorResult && <MonitorResult result={monitorResult} />}
        {monitorError && (
          <div style={{ padding: "12px 16px", backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, fontSize: 13, color: "#DC2626", fontFamily: FONT }}>
            {monitorError}
          </div>
        )}

        {/* Queue items */}
        {items.length === 0 ? (
          <div style={{
            padding: 32, textAlign: "center", backgroundColor: "white",
            borderRadius: 12, border: "1px solid #E2E8F0",
          }}>
            <p style={{ margin: 0, fontSize: 15, color: "#94A3B8", fontFamily: FONT }}>
              No items in the review queue.
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#CBD5E1", fontFamily: FONT }}>
              Run the monitoring job above to fetch new regulations from EUR-Lex.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <QueueItemCard
              key={item.id}
              item={item}
              onInterpreted={handleInterpreted}
              onApproved={removeItem}
              onRejected={removeItem}
            />
          ))
        )}
      </div>
    </div>
  );
}

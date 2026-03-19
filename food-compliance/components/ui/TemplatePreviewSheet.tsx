"use client";

/**
 * TemplatePreviewSheet
 *
 * Full-screen bottom sheet that:
 * 1. Calls GET /api/products/[productId]/templates/[type] to load the HTML preview.
 * 2. Renders the HTML inside a sandboxed <iframe>.
 * 3. Lets the user save the draft via POST to the same route.
 *
 * Props
 * ─────
 * productId    – UUID of the product
 * templateType – one of the 5 template keys
 * templateName – human-readable label shown in the header
 * onClose      – called when the sheet is dismissed
 * onSaved      – called with the new DocumentWithUrl after a successful save
 */

import { useEffect, useRef, useState } from "react";
import { X, Download, FileText } from "lucide-react";
import type { DocumentWithUrl } from "@/components/ui/DocumentRow";

export type TemplateType =
  | "allergen_statement"
  | "nutritional_declaration"
  | "product_spec"
  | "traceability_report"
  | "haccp_summary";

interface TemplatePreviewSheetProps {
  productId:    string;
  templateType: TemplateType;
  templateName: string;
  onClose:      () => void;
  onSaved:      (doc: DocumentWithUrl) => void;
}

export default function TemplatePreviewSheet({
  productId,
  templateType,
  templateName,
  onClose,
  onSaved,
}: TemplatePreviewSheetProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [html,    setHtml]    = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  // ── Fetch HTML on mount ──────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/products/${productId}/templates/${templateType}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data = await res.json();
        if (!cancelled) setHtml(data.html as string);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load template preview. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [productId, templateType]);

  // ── Write HTML into iframe when it arrives ───────────────────────────────────

  useEffect(() => {
    if (!html || !iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  // ── Save as draft ────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!html) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/products/${productId}/templates/${templateType}`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ html }),
        },
      );
      if (!res.ok) throw new Error("Save failed");
      const { document: doc } = await res.json();
      setSaved(true);
      onSaved(doc as DocumentWithUrl);
      // Auto-close after a short delay so the user sees the confirmation
      setTimeout(onClose, 1200);
    } catch {
      setError("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Prevent body scroll while sheet is open ──────────────────────────────────

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:        "fixed",
          inset:           0,
          backgroundColor: "rgba(0,0,0,0.45)",
          zIndex:          1000,
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position:        "fixed",
          bottom:          0,
          left:            0,
          right:           0,
          top:             48,           // leave a small strip at the top
          backgroundColor: "white",
          borderRadius:    "16px 16px 0 0",
          display:         "flex",
          flexDirection:   "column",
          zIndex:          1001,
          overflow:        "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display:         "flex",
            alignItems:      "center",
            gap:             10,
            padding:         "14px 16px",
            borderBottom:    "1px solid #E2E8F0",
            flexShrink:      0,
            backgroundColor: "white",
          }}
        >
          <div
            style={{
              width:           32,
              height:          32,
              borderRadius:    8,
              backgroundColor: "#EFF6FF",
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              flexShrink:      0,
            }}
          >
            <FileText size={16} color="#2563EB" />
          </div>

          <div style={{ flex: 1, overflow: "hidden" }}>
            <p
              style={{
                margin:       0,
                fontSize:     14,
                fontWeight:   700,
                color:        "#1E293B",
                fontFamily:   "var(--font-body), DM Sans, sans-serif",
                overflow:     "hidden",
                textOverflow: "ellipsis",
                whiteSpace:   "nowrap",
              }}
            >
              {templateName}
            </p>
            <p
              style={{
                margin:     0,
                fontSize:   11,
                color:      "#94A3B8",
                fontFamily: "var(--font-body), DM Sans, sans-serif",
              }}
            >
              Preview — review before saving
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background:     "none",
              border:         "none",
              padding:        0,
              cursor:         "pointer",
              color:          "#64748B",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              borderRadius:   6,
              flexShrink:     0,
              minWidth:       44,
              minHeight:      44,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Preview area */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {loading && (
            <div
              style={{
                position:       "absolute",
                inset:          0,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                backgroundColor: "white",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width:           32,
                    height:          32,
                    border:          "3px solid #E2E8F0",
                    borderTopColor:  "#2563EB",
                    borderRadius:    "50%",
                    animation:       "spin 0.7s linear infinite",
                    margin:          "0 auto 12px",
                  }}
                />
                <p
                  style={{
                    fontSize:   13,
                    color:      "#94A3B8",
                    fontFamily: "var(--font-body), DM Sans, sans-serif",
                    margin:     0,
                  }}
                >
                  Generating preview…
                </p>
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {error && !loading && (
            <div
              style={{
                position:       "absolute",
                inset:          0,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                padding:        24,
              }}
            >
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontSize:   14,
                    color:      "#DC2626",
                    fontFamily: "var(--font-body), DM Sans, sans-serif",
                    margin:     "0 0 12px",
                  }}
                >
                  {error}
                </p>
                <button
                  onClick={() => { setError(null); setLoading(true); }}
                  style={{
                    height:          36,
                    paddingLeft:     16,
                    paddingRight:    16,
                    borderRadius:    8,
                    border:          "none",
                    backgroundColor: "#2563EB",
                    color:           "white",
                    fontSize:        13,
                    fontWeight:      600,
                    fontFamily:      "var(--font-body), DM Sans, sans-serif",
                    cursor:          "pointer",
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!loading && !error && (
            <iframe
              ref={iframeRef}
              title={templateName}
              sandbox="allow-same-origin"
              style={{
                width:  "100%",
                height: "100%",
                border: "none",
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding:         "12px 16px",
            borderTop:       "1px solid #E2E8F0",
            backgroundColor: "white",
            flexShrink:      0,
            display:         "flex",
            gap:             8,
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex:         1,
              height:       48,
              borderRadius: 10,
              border:       "1px solid #CBD5E1",
              background:   "white",
              fontSize:     14,
              fontWeight:   600,
              color:        "#64748B",
              fontFamily:   "var(--font-body), DM Sans, sans-serif",
              cursor:       "pointer",
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving || saved || !html}
            style={{
              flex:            2,
              height:          48,
              borderRadius:    10,
              border:          "none",
              backgroundColor: saved ? "#16A34A" : "#2563EB",
              color:           "white",
              fontSize:        14,
              fontWeight:      700,
              fontFamily:      "var(--font-body), DM Sans, sans-serif",
              cursor:          saving || saved || !html ? "not-allowed" : "pointer",
              opacity:         !html && !saved ? 0.6 : 1,
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              gap:             6,
              transition:      "background-color 0.2s ease",
            }}
          >
            {saved ? (
              "Saved!"
            ) : saving ? (
              "Saving…"
            ) : (
              <>
                <Download size={14} />
                Save as Draft
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

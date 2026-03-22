"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ExternalLink, X, MessageCircle } from "lucide-react";
import RegulationExplainer from "@/components/ui/RegulationExplainer";

interface ComplianceAnchorProps {
  /** Regulation code shown on the pill, e.g. "EU 1169/2011" */
  code: string;
  /** Article reference, e.g. "Article 9 — Mandatory particulars" */
  article: string;
  /** Plain-English explanation of what this regulation requires (fallback) */
  explanation: string;
  /** Direct EUR-Lex URL to the full legal text (fallback) */
  url: string;
  /** If provided, enables the "Ask the advisor about this" inline explainer */
  productId?: string;
}

interface RegulationData {
  title: string;
  summary: string | null;
  official_url: string | null;
}

/**
 * ComplianceAnchor
 *
 * Small tappable regulation pill that opens a popover with:
 *   - Regulation code (header)
 *   - Article reference
 *   - Plain-English explanation (fetched from DB, with prop fallback)
 *   - Link to EUR-Lex (fetched from DB, with prop fallback)
 *   - "Ask the advisor about this" button (when productId is provided)
 */
export default function ComplianceAnchor({
  code,
  article,
  explanation,
  url,
  productId,
}: ComplianceAnchorProps) {
  const [regData, setRegData]         = useState<RegulationData | null>(null);
  const [fetched, setFetched]         = useState(false);
  const [showExplainer, setExplainer] = useState(false);

  // Fetch real regulation data when the popover is first opened
  function handleOpenChange(open: boolean) {
    if (open && !fetched) {
      setFetched(true);
      fetch(`/api/admin/regulations?code=${encodeURIComponent(code)}`)
        .then((r) => r.json())
        .then((data: RegulationData[]) => {
          if (Array.isArray(data) && data.length > 0) {
            setRegData(data[0]);
          }
        })
        .catch(() => {/* fall back to props */});
    }
    if (!open) setExplainer(false);
  }

  const displayExplanation = regData?.summary ?? explanation;
  const displayUrl         = regData?.official_url ?? url;
  const displayTitle       = regData?.title ?? null;

  return (
    <Popover.Root onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          aria-label={`View regulation ${code}`}
          style={{
            display:         "inline-flex",
            alignItems:      "center",
            justifyContent:  "center",
            minHeight:       44,
            padding:         "0 8px",
            borderRadius:    20,
            fontSize:        10,
            fontWeight:      600,
            textTransform:   "uppercase",
            letterSpacing:   "0.06em",
            color:           "#2563EB",
            backgroundColor: "#EFF6FF",
            border:          "1px solid #BFDBFE",
            fontFamily:      "var(--font-body), DM Sans, sans-serif",
            cursor:          "pointer",
            whiteSpace:      "nowrap",
            lineHeight:      1.4,
            background:      "none",
          }}
        >
          <span style={{
            display:         "inline-flex",
            alignItems:      "center",
            padding:         "3px 8px",
            borderRadius:    20,
            backgroundColor: "#EFF6FF",
            border:          "1px solid #BFDBFE",
          }}>
            {code}
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={6}
          style={{ maxWidth: showExplainer ? 320 : 280, zIndex: 50 }}
          className="rounded-xl bg-white p-4 shadow-lg border border-border"
        >
          {/* Close */}
          <Popover.Close
            aria-label="Close"
            style={{
              position:       "absolute",
              top:            0,
              right:          0,
              minWidth:       44,
              minHeight:      44,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              background:     "none",
              border:         "none",
              cursor:         "pointer",
              color:          "#94A3B8",
              borderRadius:   "0 12px 0 0",
            }}
          >
            <X size={14} />
          </Popover.Close>

          {/* Code */}
          <p
            style={{
              fontSize:      10,
              fontWeight:    700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color:         "#2563EB",
              marginBottom:  4,
              fontFamily:    "var(--font-body), DM Sans, sans-serif",
            }}
          >
            {code}
          </p>

          {/* Title (from DB) */}
          {displayTitle && (
            <p
              style={{
                fontSize:     12,
                fontWeight:   700,
                color:        "#1E293B",
                marginBottom: 4,
                lineHeight:   1.4,
                fontFamily:   "var(--font-body), DM Sans, sans-serif",
              }}
            >
              {displayTitle}
            </p>
          )}

          {/* Article */}
          <p
            style={{
              fontSize:     13,
              fontWeight:   600,
              color:        "#1E293B",
              marginBottom: 6,
              lineHeight:   1.4,
              fontFamily:   "var(--font-body), DM Sans, sans-serif",
            }}
          >
            {article}
          </p>

          {/* Plain-English explanation */}
          <p
            style={{
              fontSize:     12,
              color:        "#475569",
              lineHeight:   1.55,
              marginBottom: 12,
              fontFamily:   "var(--font-body), DM Sans, sans-serif",
            }}
          >
            {displayExplanation}
          </p>

          {/* EUR-Lex link */}
          {displayUrl && (
            <a
              href={displayUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display:        "inline-flex",
                alignItems:     "center",
                gap:            4,
                fontSize:       12,
                fontWeight:     600,
                color:          "#2563EB",
                textDecoration: "none",
                fontFamily:     "var(--font-body), DM Sans, sans-serif",
              }}
            >
              Read full text on EUR-Lex
              <ExternalLink size={11} />
            </a>
          )}

          {/* Ask the advisor — only if productId is available */}
          {productId && !showExplainer && (
            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => setExplainer(true)}
                style={{
                  display:         "inline-flex",
                  alignItems:      "center",
                  gap:             5,
                  fontSize:        12,
                  fontWeight:      600,
                  color:           "#7C3AED",
                  backgroundColor: "#F5F3FF",
                  border:          "1px solid #DDD6FE",
                  borderRadius:    8,
                  padding:         "5px 10px",
                  cursor:          "pointer",
                  fontFamily:      "var(--font-body), DM Sans, sans-serif",
                }}
              >
                <MessageCircle size={12} />
                Ask the advisor about this
              </button>
            </div>
          )}

          {/* Inline regulation explainer */}
          {productId && showExplainer && (
            <RegulationExplainer
              code={code}
              productId={productId}
              onClose={() => setExplainer(false)}
            />
          )}

          <Popover.Arrow
            style={{ fill: "white", filter: "drop-shadow(0 1px 0 #E2E8F0)" }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

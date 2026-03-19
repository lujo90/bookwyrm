"use client";

import * as Popover from "@radix-ui/react-popover";
import { ExternalLink, X } from "lucide-react";

interface ComplianceAnchorProps {
  /** Regulation code shown on the pill, e.g. "EU 1169/2011" */
  code: string;
  /** Article reference, e.g. "Article 9 — Mandatory particulars" */
  article: string;
  /** Plain-English explanation of what this regulation requires */
  explanation: string;
  /** Direct EUR-Lex URL to the full legal text */
  url: string;
}

/**
 * ComplianceAnchor
 *
 * Small tappable regulation pill that opens a popover with:
 *   - Regulation code (header)
 *   - Article reference
 *   - Plain-English explanation
 *   - Link to EUR-Lex
 *
 * Spec: 10px DM Sans 600, uppercase, #2563EB on #EFF6FF,
 *       1px solid #BFDBFE, padding 3px 8px, border-radius 20px.
 *       Popover max-width 280px.
 */
export default function ComplianceAnchor({
  code,
  article,
  explanation,
  url,
}: ComplianceAnchorProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label={`View regulation ${code}`}
          style={{
            display:        "inline-flex",
            alignItems:     "center",
            justifyContent: "center",
            minHeight:      44,
            padding:        "0 8px",
            borderRadius:   20,
            fontSize:       10,
            fontWeight:     600,
            textTransform:  "uppercase",
            letterSpacing:  "0.06em",
            color:          "#2563EB",
            backgroundColor: "#EFF6FF",
            border:         "1px solid #BFDBFE",
            fontFamily:     "var(--font-body), DM Sans, sans-serif",
            cursor:         "pointer",
            whiteSpace:     "nowrap",
            lineHeight:     1.4,
            background:     "none",
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
          style={{ maxWidth: 280, zIndex: 50 }}
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
            {explanation}
          </p>

          {/* EUR-Lex link */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display:    "inline-flex",
              alignItems: "center",
              gap:        4,
              fontSize:   12,
              fontWeight: 600,
              color:      "#2563EB",
              textDecoration: "none",
              fontFamily: "var(--font-body), DM Sans, sans-serif",
            }}
          >
            Read full text on EUR-Lex
            <ExternalLink size={11} />
          </a>

          <Popover.Arrow
            style={{ fill: "white", filter: "drop-shadow(0 1px 0 #E2E8F0)" }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

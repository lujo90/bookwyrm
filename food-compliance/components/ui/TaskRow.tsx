"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import ComplianceAnchor from "@/components/ui/ComplianceAnchor";

interface TaskRowProps {
  title: string;
  /** Regulation code, e.g. "EU 1169/2011" */
  regulation?: string;
  /** Article reference shown in the popover */
  regulationArticle?: string;
  /** Plain-English explanation shown in the popover */
  regulationExplanation?: string;
  /** EUR-Lex URL shown in the popover */
  regulationUrl?: string;
  /** If true, shows a red BLOCKING pill */
  blocking: boolean;
  /** Completed state */
  done: boolean;
  /** Expandable help text */
  helpText?: string;
  /** Called when the checkbox is tapped */
  onToggle: () => void;
}

/**
 * TaskRow
 *
 * Single checklist task row.
 *
 * Layout:
 *   [checkbox]  [title + BLOCKING pill + regulation anchor]  [chevron]
 *   [helpText — expanded on tap, 0.25s ease]
 *
 * Min-height: 44px (accessibility target).
 * Title strikes through and fades when done.
 */
export default function TaskRow({
  title,
  regulation,
  regulationArticle,
  regulationExplanation,
  regulationUrl,
  blocking,
  done,
  helpText,
  onToggle,
}: TaskRowProps) {
  const [expanded, setExpanded] = useState(false);

  const hasRegulation =
    regulation && regulationArticle && regulationExplanation && regulationUrl;

  return (
    <div
      style={{
        backgroundColor: "white",
        borderBottom:    "1px solid #E2E8F0",
      }}
    >
      {/* ── Main row ─────────────────────────────────────────────── */}
      <div
        style={{
          display:       "flex",
          alignItems:    "center",
          gap:           12,
          paddingLeft:   16,
          paddingRight:  helpText ? 8 : 16,
          paddingTop:    11,
          paddingBottom: 11,
          minHeight:     44,
        }}
      >
        {/* Custom checkbox */}
        <button
          onClick={onToggle}
          aria-label={done ? "Mark incomplete" : "Mark complete"}
          style={{
            flexShrink:      0,
            width:           22,
            height:          22,
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            background:      "none",
            border:          "none",
            padding:         0,
            cursor:          "pointer",
          }}
        >
          {done ? (
            /* Filled blue circle with check */
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="11" fill="#2563EB" />
              <path
                d="M6.5 11.5L9.5 14.5L15.5 8.5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            /* Empty circle */
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="10" stroke="#CBD5E1" strokeWidth="1.5" />
            </svg>
          )}
        </button>

        {/* Text content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div
            style={{
              display:    "flex",
              alignItems: "center",
              flexWrap:   "wrap",
              gap:        6,
              marginBottom: hasRegulation ? 4 : 0,
            }}
          >
            <span
              style={{
                fontSize:       14,
                fontWeight:     600,
                color:          done ? "#94A3B8" : "#1E293B",
                textDecoration: done ? "line-through" : "none",
                fontFamily:     "var(--font-body), DM Sans, sans-serif",
                lineHeight:     1.4,
              }}
            >
              {title}
            </span>

            {blocking && !done && (
              <span
                style={{
                  fontSize:       10,
                  fontWeight:     700,
                  textTransform:  "uppercase",
                  letterSpacing:  "0.06em",
                  color:          "#DC2626",
                  backgroundColor: "#FEF2F2",
                  padding:        "2px 6px",
                  borderRadius:   20,
                  fontFamily:     "var(--font-body), DM Sans, sans-serif",
                  lineHeight:     1.4,
                  whiteSpace:     "nowrap",
                }}
              >
                Blocking
              </span>
            )}
          </div>

          {/* Regulation anchor — on its own line */}
          {hasRegulation && !done && (
            <ComplianceAnchor
              code={regulation!}
              article={regulationArticle!}
              explanation={regulationExplanation!}
              url={regulationUrl!}
            />
          )}
        </div>

        {/* Expand / collapse chevron */}
        {helpText && (
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse help" : "Expand help"}
            aria-expanded={expanded}
            style={{
              flexShrink:     0,
              width:          32,
              height:         32,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              background:     "none",
              border:         "none",
              padding:        0,
              cursor:         "pointer",
              color:          "#94A3B8",
              transform:      expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition:     "transform 0.2s ease",
            }}
          >
            <ChevronDown size={16} />
          </button>
        )}
      </div>

      {/* ── Help text panel ──────────────────────────────────────── */}
      {helpText && (
        <div
          style={{
            overflow:   "hidden",
            maxHeight:  expanded ? 200 : 0,
            transition: "max-height 0.25s ease",
          }}
        >
          <p
            style={{
              /* Indent to align with title (16px + 22px checkbox + 12px gap) */
              paddingLeft:   50,
              paddingRight:  16,
              paddingBottom: 12,
              paddingTop:    0,
              fontSize:      13,
              color:         "#475569",
              lineHeight:    1.55,
              fontFamily:    "var(--font-body), DM Sans, sans-serif",
              margin:        0,
            }}
          >
            {helpText}
          </p>
        </div>
      )}
    </div>
  );
}

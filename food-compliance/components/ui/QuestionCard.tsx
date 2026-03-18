"use client";

import { ChevronLeft } from "lucide-react";
import ComplianceAnchor from "@/components/ui/ComplianceAnchor";

interface QuestionCardProps {
  /** Current step (1-based) */
  step: number;
  /** Total number of steps in this flow */
  totalSteps: number;
  /** Small grey context label above the question */
  contextLine?: string;
  /** The main question — large bold */
  question: string;
  /** Small green hint shown below the input slot */
  forwardSignal?: string;
  /** Input element(s) for this step */
  children: React.ReactNode;
  /** Back handler — omit to hide the Back button */
  onBack?: () => void;
  /** Continue handler */
  onContinue?: () => void;
  /** Disables the Continue button when false */
  canContinue?: boolean;
  /** Optional regulation code for ComplianceAnchor, e.g. "EU 1169/2011" */
  regulationCode?: string;
  /** Article reference, e.g. "Article 9 — Mandatory particulars" */
  regulationArticle?: string;
  /** Plain-English explanation of the regulation */
  regulationExplanation?: string;
  /** EUR-Lex URL */
  regulationUrl?: string;
}

/**
 * QuestionCard
 *
 * Wraps each step in a guided onboarding or product-setup flow.
 *
 * Four-element content structure:
 *   1. Context line  — 11px pale uppercase
 *   2. Question      — 22px DM Sans 700
 *   3. Input slot    — children
 *   4. Forward signal — 12px success green
 *
 * A ComplianceAnchor pill is rendered between the question and the input
 * slot when all four regulation props are provided.
 *
 * Back button:  ghost style, min-height 44px.
 * Continue btn: full-width, 48px, Outfit 800.
 */
export default function QuestionCard({
  step,
  totalSteps,
  contextLine,
  question,
  forwardSignal,
  children,
  onBack,
  onContinue,
  canContinue = true,
  regulationCode,
  regulationArticle,
  regulationExplanation,
  regulationUrl,
}: QuestionCardProps) {
  const progressPercent = Math.round((step / totalSteps) * 100);
  const hasRegulation   =
    regulationCode && regulationArticle && regulationExplanation && regulationUrl;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "white" }}>

      {/* ── Progress bar ──────────────────────────────────────────── */}
      <div style={{ height: 3, backgroundColor: "#F1F5F9", flexShrink: 0 }}>
        <div
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          style={{
            height:     "100%",
            width:      `${progressPercent}%`,
            backgroundColor: "#2563EB",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* ── Header row: Back + step counter ───────────────────────── */}
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          paddingLeft:    16,
          paddingRight:   16,
          paddingTop:     4,
          paddingBottom:  4,
          flexShrink:     0,
          minHeight:      44,
        }}
      >
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="Go back"
            style={{
              display:     "flex",
              alignItems:  "center",
              gap:         2,
              minHeight:   44,
              background:  "none",
              border:      "none",
              padding:     "0 8px 0 0",
              color:       "#64748B",
              fontSize:    14,
              fontWeight:  500,
              fontFamily:  "var(--font-body), DM Sans, sans-serif",
              cursor:      "pointer",
              marginLeft:  -8,
            }}
          >
            <ChevronLeft size={18} />
            Back
          </button>
        ) : (
          <div style={{ minHeight: 44 }} />
        )}
        <span
          style={{
            marginLeft: "auto",
            fontSize:   12,
            color:      "#94A3B8",
            fontFamily: "var(--font-body), DM Sans, sans-serif",
            fontWeight: 500,
          }}
        >
          {step} of {totalSteps}
        </span>
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      <div
        style={{
          flex:          1,
          display:       "flex",
          flexDirection: "column",
          paddingLeft:   20,
          paddingRight:  20,
          paddingTop:    8,
          paddingBottom: 8,
          gap:           16,
        }}
      >
        {/* 1. Context line */}
        {contextLine && (
          <p
            style={{
              fontSize:      11,
              fontWeight:    500,
              color:         "#94A3B8",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              fontFamily:    "var(--font-body), DM Sans, sans-serif",
              margin:        0,
              lineHeight:    1.4,
            }}
          >
            {contextLine}
          </p>
        )}

        {/* 2. Question */}
        <h2
          style={{
            fontSize:   22,
            fontWeight: 700,
            color:      "#1E293B",
            lineHeight: 1.3,
            fontFamily: "var(--font-body), DM Sans, sans-serif",
            margin:     0,
          }}
        >
          {question}
        </h2>

        {/* Regulation anchor — between question and input */}
        {hasRegulation && (
          <div>
            <ComplianceAnchor
              code={regulationCode!}
              article={regulationArticle!}
              explanation={regulationExplanation!}
              url={regulationUrl!}
            />
          </div>
        )}

        {/* 3. Input slot */}
        <div style={{ flex: 1 }}>{children}</div>

        {/* 4. Forward signal */}
        {forwardSignal && (
          <p
            style={{
              fontSize:   12,
              fontWeight: 500,
              color:      "#16A34A",
              fontFamily: "var(--font-body), DM Sans, sans-serif",
              margin:     0,
              lineHeight: 1.5,
            }}
          >
            {forwardSignal}
          </p>
        )}
      </div>

      {/* ── Continue button ────────────────────────────────────────── */}
      <div style={{ padding: "8px 20px 32px", flexShrink: 0 }}>
        <button
          onClick={onContinue}
          disabled={!canContinue}
          style={{
            width:       "100%",
            height:      48,
            borderRadius: 12,
            border:      "none",
            fontSize:    16,
            fontWeight:  800,
            fontFamily:  "var(--font-display), Outfit, sans-serif",
            letterSpacing: "0.01em",
            transition:  "all 0.15s ease",
            cursor:      canContinue ? "pointer" : "not-allowed",
            ...(canContinue
              ? { backgroundColor: "#2563EB", color: "white" }
              : { backgroundColor: "#F1F5F9", color: "#94A3B8" }),
          }}
        >
          Continue
        </button>
      </div>

    </div>
  );
}

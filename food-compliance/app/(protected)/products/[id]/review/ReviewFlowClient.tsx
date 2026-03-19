"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import QuestionCard from "@/components/ui/QuestionCard";
import type { Review } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReviewStep {
  type:       string;
  question:   string;
  navigateTo: string;           // tab name or hash to jump to if user says No
  itemType:   string;
  itemId:     string | null;
  metadata:   Record<string, unknown>;
}

interface ReviewFlowClientProps {
  productId:          string;
  productName:        string;
  steps:              ReviewStep[];
  activeReview:       Review | null;
  actorEmail:         string;
  blockingIncomplete: string[];
}

// Label shown above the question (context line)
const STEP_LABELS: Record<string, string> = {
  allergens:    "Allergen Declaration",
  label_artwork:"Label Artwork",
  haccp:        "HACCP Document",
  nutritional:  "Nutritional Declaration",
  suppliers:    "Supply Chain",
  certification:"Certification",
  regulation:   "Regulation Check",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReviewFlowClient({
  productId,
  productName,
  steps,
  activeReview,
  actorEmail,
  blockingIncomplete,
}: ReviewFlowClientProps) {
  const router = useRouter();

  // Start from saved step if resuming
  const [reviewId,      setReviewId]      = useState<string | null>(activeReview?.id ?? null);
  const [stepIndex,     setStepIndex]     = useState<number>(activeReview?.current_step ?? 0);
  const [answer,        setAnswer]        = useState<boolean | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [completed,     setCompleted]     = useState(false);
  const [noMessage,     setNoMessage]     = useState<string | null>(null);

  const totalSteps = steps.length;

  // ─── Ensure a review record exists ────────────────────────────────────────

  const ensureReview = useCallback(async (): Promise<string | null> => {
    if (reviewId) return reviewId;

    const res = await fetch(`/api/products/${productId}/reviews`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ total_steps: totalSteps }),
    });
    if (!res.ok) return null;
    const { review } = await res.json();
    setReviewId(review.id);
    return review.id;
  }, [reviewId, productId, totalSteps]);

  // ─── Handle continue (after Yes or No is selected) ─────────────────────────

  const handleContinue = useCallback(async () => {
    if (answer === null || saving) return;
    setSaving(true);

    const rId = await ensureReview();
    if (!rId) { setSaving(false); return; }

    const step = steps[stepIndex];

    // Post confirmation
    await fetch(`/api/products/${productId}/reviews/${rId}/confirmations`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        step:      stepIndex,
        item_type: step.itemType,
        item_id:   step.itemId,
        question:  step.question,
        confirmed: answer,
      }),
    });

    if (!answer) {
      // No — save progress and navigate to relevant tab
      await fetch(`/api/products/${productId}/reviews/${rId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ current_step: stepIndex }),
      });

      // Show brief message then navigate
      const tabLabel = STEP_LABELS[step.type] ?? "this section";
      setNoMessage(`Update your ${tabLabel.toLowerCase()}, then return to continue your review.`);
      setSaving(false);

      setTimeout(() => {
        router.push(`/products/${productId}?tab=${step.navigateTo}`);
      }, 1800);
      return;
    }

    // Yes — advance to next step
    const nextStep = stepIndex + 1;

    if (nextStep >= totalSteps) {
      // Final step — complete the review
      const allBlockingDone = blockingIncomplete.length === 0;

      await fetch(`/api/products/${productId}/reviews/${rId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          current_step:    nextStep,
          status:          "completed",
          completed_at:    new Date().toISOString(),
          completed_by:    actorEmail,
          approve_product: allBlockingDone,
        }),
      });

      setCompleted(true);
      setSaving(false);
      return;
    }

    // Save progress and advance
    await fetch(`/api/products/${productId}/reviews/${rId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ current_step: nextStep }),
    });

    setStepIndex(nextStep);
    setAnswer(null);
    setSaving(false);
  }, [answer, saving, ensureReview, steps, stepIndex, productId, totalSteps, actorEmail, blockingIncomplete, router]);

  // ─── Completion screen ────────────────────────────────────────────────────

  if (completed) {
    return (
      <div
        style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          minHeight:      "100vh",
          backgroundColor:"white",
          padding:        "40px 24px",
          gap:            20,
        }}
      >
        {/* Green checkmark */}
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <circle cx="36" cy="36" r="36" fill="#DCFCE7" />
          <circle cx="36" cy="36" r="28" fill="#16A34A" />
          <path
            d="M22 37L31 46L50 27"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize:   26,
              fontWeight: 800,
              color:      "#1E293B",
              fontFamily: "var(--font-display), Outfit, sans-serif",
              margin:     "0 0 8px",
            }}
          >
            Review complete.
          </h1>
          <p
            style={{
              fontSize:   15,
              color:      "#475569",
              fontFamily: "var(--font-body), DM Sans, sans-serif",
              margin:     0,
              lineHeight: 1.6,
              maxWidth:   280,
            }}
          >
            Your score is now 100%. Your compliance pack is ready.
          </p>
        </div>

        <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Download Compliance Pack — Phase 13 */}
          <button
            disabled
            style={{
              width:           "100%",
              height:          52,
              borderRadius:    12,
              border:          "none",
              fontSize:        16,
              fontWeight:      800,
              fontFamily:      "var(--font-display), Outfit, sans-serif",
              backgroundColor: "#E2E8F0",
              color:           "#94A3B8",
              cursor:          "not-allowed",
            }}
          >
            Download Compliance Pack
          </button>

          <button
            onClick={() => router.push(`/products/${productId}`)}
            style={{
              width:           "100%",
              height:          48,
              borderRadius:    12,
              border:          "1.5px solid #E2E8F0",
              background:      "white",
              fontSize:        15,
              fontWeight:      600,
              fontFamily:      "var(--font-body), DM Sans, sans-serif",
              color:           "#475569",
              cursor:          "pointer",
            }}
          >
            Back to product
          </button>
        </div>
      </div>
    );
  }

  // ─── Edge case: no steps ──────────────────────────────────────────────────

  if (steps.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-body), DM Sans, sans-serif", color: "#475569" }}>
          No review steps available yet. Complete more of your checklist first.
        </p>
        <button
          onClick={() => router.push(`/products/${productId}`)}
          style={{
            marginTop: 16, padding: "10px 20px", borderRadius: 10,
            backgroundColor: "#2563EB", color: "white", border: "none",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
            fontFamily: "var(--font-body), DM Sans, sans-serif",
          }}
        >
          Back to product
        </button>
      </div>
    );
  }

  // ─── Step screen ─────────────────────────────────────────────────────────

  const currentStep = steps[stepIndex];
  const contextLine = STEP_LABELS[currentStep.type] ?? "Review";

  return (
    <QuestionCard
      step={stepIndex + 1}
      totalSteps={totalSteps}
      contextLine={contextLine}
      question={currentStep.question}
      onBack={stepIndex > 0 ? () => { setStepIndex((s) => s - 1); setAnswer(null); setNoMessage(null); } : undefined}
      onContinue={handleContinue}
      canContinue={answer !== null && !saving}
    >
      {/* ── No message banner ──────────────────────────────────────────── */}
      {noMessage && (
        <div
          style={{
            backgroundColor: "#FFFBEB",
            border:          "1px solid #FDE68A",
            borderRadius:    10,
            padding:         "10px 14px",
            marginBottom:    16,
          }}
        >
          <p style={{
            fontSize:   13,
            color:      "#92400E",
            margin:     0,
            fontFamily: "var(--font-body), DM Sans, sans-serif",
            lineHeight: 1.5,
          }}>
            {noMessage}
          </p>
        </div>
      )}

      {/* ── Yes / No buttons ────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button
          onClick={() => setAnswer(true)}
          style={{
            width:           "100%",
            minHeight:       52,
            borderRadius:    12,
            border:          answer === true ? "none" : "1.5px solid #E2E8F0",
            fontSize:        16,
            fontWeight:      700,
            fontFamily:      "var(--font-body), DM Sans, sans-serif",
            cursor:          "pointer",
            transition:      "all 0.15s ease",
            ...(answer === true
              ? { backgroundColor: "#2563EB", color: "white" }
              : { backgroundColor: "white", color: "#1E293B" }),
          }}
        >
          Yes
        </button>

        <button
          onClick={() => setAnswer(false)}
          style={{
            width:           "100%",
            minHeight:       52,
            borderRadius:    12,
            border:          answer === false ? "none" : "1.5px solid #E2E8F0",
            fontSize:        16,
            fontWeight:      700,
            fontFamily:      "var(--font-body), DM Sans, sans-serif",
            cursor:          "pointer",
            transition:      "all 0.15s ease",
            ...(answer === false
              ? { backgroundColor: "#DC2626", color: "white" }
              : { backgroundColor: "white", color: "#1E293B" }),
          }}
        >
          No
        </button>
      </div>
    </QuestionCard>
  );
}

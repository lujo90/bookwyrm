"use client";

import { ChevronLeft } from "lucide-react";

interface QuestionCardProps {
  /** Small grey label above the question, e.g. "Step context" */
  context?: string;
  /** The main question text — displayed large and bold */
  question: string;
  /** Optional hint shown in small green text below the input */
  forwardSignal?: string;
  /** Current step number (1-based) */
  step: number;
  /** Total number of steps in this flow */
  totalSteps: number;
  /** Called when the user taps the back button */
  onBack?: () => void;
  /** Called when the user taps the Continue button */
  onContinue?: () => void;
  /** Whether the Continue button is enabled */
  canContinue?: boolean;
  /** The input element(s) for this step */
  children: React.ReactNode;
}

/**
 * QuestionCard
 *
 * Wraps each step in a guided onboarding / product-setup flow.
 *
 * Layout (top → bottom):
 *  - Progress bar (step X of Y)
 *  - Back button
 *  - Context line (small grey)
 *  - Question (large bold)
 *  - Input slot (children)
 *  - Forward signal (small green)
 *  - Continue button
 */
export default function QuestionCard({
  context,
  question,
  forwardSignal,
  step,
  totalSteps,
  onBack,
  onContinue,
  canContinue = true,
  children,
}: QuestionCardProps) {
  const progressPercent = Math.round((step / totalSteps) * 100);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* ── Progress bar ─────────────────────────────────────────────── */}
      <div className="h-1 bg-slate-100 shrink-0">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          role="progressbar"
        />
      </div>

      {/* ── Header row ───────────────────────────────────────────────── */}
      <div className="flex items-center px-4 pt-3 pb-1 shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-light hover:text-mid transition-colors -ml-1"
            aria-label="Go back"
          >
            <ChevronLeft size={18} />
            Back
          </button>
        )}
        <span className="ml-auto text-xs text-light">
          {step} of {totalSteps}
        </span>
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 pt-4 pb-2 flex flex-col">
        {context && (
          <p className="text-xs text-light mb-2 uppercase tracking-wide">
            {context}
          </p>
        )}

        <h2 className="text-2xl font-bold text-dark leading-snug mb-6">
          {question}
        </h2>

        {/* Input slot */}
        <div className="flex-1">{children}</div>

        {forwardSignal && (
          <p className="text-xs text-success mt-3">{forwardSignal}</p>
        )}
      </div>

      {/* ── Continue button ───────────────────────────────────────────── */}
      <div className="px-4 pb-8 pt-2 shrink-0">
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className={[
            "w-full rounded-xl py-3.5 text-sm font-semibold transition-all",
            canContinue
              ? "bg-primary text-white hover:bg-blue-700 active:scale-[0.98]"
              : "bg-slate-100 text-slate-400 cursor-not-allowed",
          ].join(" ")}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { EXPLAIN_REGULATION } from "@/lib/agent/onDemandPrompts";

interface RegulationExplainerProps {
  /** Regulation code to explain, e.g. "EU 1169/2011" */
  code:      string;
  /** Product context for the agent */
  productId: string;
  /** Called when the user closes the explainer */
  onClose:   () => void;
}

/**
 * RegulationExplainer
 *
 * Inline component rendered inside a ComplianceAnchor popover.
 * On mount it immediately streams an explanation of the regulation from the agent,
 * displaying the response word by word.
 */
export default function RegulationExplainer({
  code,
  productId,
  onClose,
}: RegulationExplainerProps) {
  const [text, setText]         = useState("");
  const [streaming, setStream]  = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const abortRef                = useRef<AbortController | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let mounted = true;

    async function run() {
      setStream(true);
      setText("");
      setError(null);

      try {
        const res = await fetch("/api/agent", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          signal:  ctrl.signal,
          body:    JSON.stringify({
            message:             EXPLAIN_REGULATION(code),
            productId,
            conversationHistory: [],
            stream:              true,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { error?: string };
          if (mounted) setError(err.error ?? "Could not load explanation.");
          return;
        }

        const reader  = res.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!mounted) { reader.cancel(); break; }
          setText((prev) => prev + decoder.decode(value, { stream: true }));
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        if (mounted) setError("Something went wrong. Please try again.");
      } finally {
        if (mounted) setStream(false);
      }
    }

    run();

    return () => {
      mounted = false;
      ctrl.abort();
    };
  }, [code, productId]);

  return (
    <div
      style={{
        marginTop:       12,
        paddingTop:      12,
        borderTop:       "1px solid #E2E8F0",
        position:        "relative",
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close explanation"
        style={{
          position:       "absolute",
          top:            8,
          right:          0,
          background:     "none",
          border:         "none",
          cursor:         "pointer",
          color:          "#94A3B8",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          padding:        4,
        }}
      >
        <X size={12} />
      </button>

      {/* Header */}
      <p
        style={{
          fontSize:     10,
          fontWeight:   700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color:        "#2563EB",
          marginBottom: 6,
          fontFamily:   "var(--font-body), DM Sans, sans-serif",
          paddingRight: 20,
        }}
      >
        AI Advisor
      </p>

      {/* Content */}
      {error ? (
        <p
          style={{
            fontSize:   12,
            color:      "#DC2626",
            lineHeight: 1.5,
            fontFamily: "var(--font-body), DM Sans, sans-serif",
          }}
        >
          {error}
        </p>
      ) : (
        <p
          style={{
            fontSize:   12,
            color:      "#475569",
            lineHeight: 1.6,
            fontFamily: "var(--font-body), DM Sans, sans-serif",
            whiteSpace: "pre-wrap",
          }}
        >
          {text || (streaming ? "" : "")}
          {streaming && (
            <span
              style={{
                display:           "inline-block",
                width:             2,
                height:            12,
                backgroundColor:   "#2563EB",
                marginLeft:        1,
                verticalAlign:     "middle",
                animation:         "blink 1s step-end infinite",
              }}
            />
          )}
          {!text && streaming && (
            <span style={{ color: "#94A3B8" }}>Loading…</span>
          )}
        </p>
      )}

      {/* Blink keyframe — injected once */}
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  );
}

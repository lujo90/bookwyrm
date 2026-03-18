"use client";

/**
 * Design Showcase — development only, not linked from the main app.
 * Visit /design to verify every component in every state.
 */

import { useState } from "react";
import ScoreGauge        from "@/components/ui/ScoreGauge";
import StatusBadge       from "@/components/ui/StatusBadge";
import ComplianceAnchor  from "@/components/ui/ComplianceAnchor";
import AutoFillBadge     from "@/components/ui/AutoFillBadge";
import TaskRow           from "@/components/ui/TaskRow";
import CategoryBar       from "@/components/ui/CategoryBar";
import QuestionCard      from "@/components/ui/QuestionCard";
import AgentBar          from "@/components/layout/AgentBar";
import AppShell          from "@/components/layout/AppShell";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2
        style={{
          fontSize:      11,
          fontWeight:    700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color:         "#94A3B8",
          fontFamily:    "var(--font-body), DM Sans, sans-serif",
          marginBottom:  16,
          paddingBottom: 8,
          borderBottom:  "1px solid #E2E8F0",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display:       "flex",
        alignItems:    "center",
        gap:           16,
        marginBottom:  12,
        flexWrap:      "wrap",
      }}
    >
      <span
        style={{
          width:      120,
          flexShrink: 0,
          fontSize:   11,
          color:      "#94A3B8",
          fontFamily: "var(--font-body), DM Sans, sans-serif",
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function Swatch({ hex, name }: { hex: string; name: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div
        style={{
          width:        44,
          height:       44,
          borderRadius: 8,
          backgroundColor: hex,
          border:       "1px solid #E2E8F0",
        }}
      />
      <span style={{ fontSize: 9, color: "#475569", fontFamily: "var(--font-body)", textAlign: "center" }}>
        {name}
      </span>
      <span style={{ fontSize: 9, color: "#94A3B8", fontFamily: "var(--font-body)", textAlign: "center" }}>
        {hex}
      </span>
    </div>
  );
}

// ─── Interactive demos ────────────────────────────────────────────────────────

function TaskRowDemo() {
  const [states, setStates] = useState({
    a: false,
    b: false,
    c: true,
    d: false,
  });

  return (
    <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
      <TaskRow
        title="Add your recipe ingredients"
        regulation="EU 1169/2011"
        regulationArticle="Article 18 — List of ingredients"
        regulationExplanation="All ingredients must be listed in descending order by weight as incorporated. Compound ingredients may be listed with their own ingredient list."
        regulationUrl="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011R1169"
        blocking
        done={states.a}
        helpText="List every ingredient in your product. Each ingredient will need to be linked to an approved supplier before your product can reach 100% compliance."
        onToggle={() => setStates((s) => ({ ...s, a: !s.a }))}
      />
      <TaskRow
        title="Upload label artwork"
        blocking
        done={states.b}
        helpText="Upload your final label artwork as a PDF or high-res image. It will be checked against your confirmed nutritional and allergen declarations."
        onToggle={() => setStates((s) => ({ ...s, b: !s.b }))}
      />
      <TaskRow
        title="Record recyclability code"
        regulation="EU 2022/1616"
        regulationArticle="Packaging and Packaging Waste Regulation"
        regulationExplanation="Packaging placed on the EU market must display the correct recyclability symbol and code from 2025 onwards."
        regulationUrl="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R1616"
        blocking={false}
        done={states.c}
        onToggle={() => setStates((s) => ({ ...s, c: !s.c }))}
      />
      <TaskRow
        title="Complete retailer data sheet"
        blocking={false}
        done={states.d}
        helpText="Most major retailers require a completed product data sheet before listing. Download the template and fill in all mandatory fields."
        onToggle={() => setStates((s) => ({ ...s, d: !s.d }))}
      />
    </div>
  );
}

function QuestionCardDemo() {
  const [step, setStep]   = useState(1);
  const [value, setValue] = useState("");

  const steps = [
    {
      contextLine:           "This is how your product will be identified.",
      question:              "What is this product called?",
      forwardSignal:         "Your product name appears on all compliance documents.",
      placeholder:           "e.g. Original Hot Sauce",
      regulationCode:        undefined,
    },
    {
      contextLine:           "Different product types have different compliance requirements.",
      question:              "What category is this product?",
      forwardSignal:         "This loads the correct compliance rules for your product type.",
      placeholder:           undefined,
      regulationCode:        "EU 1169/2011",
      regulationArticle:     "Article 9 — Mandatory particulars",
      regulationExplanation: "All food sold in the EU must display certain mandatory information on the label, including the name, ingredients, allergens, and nutritional declaration.",
      regulationUrl:         "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011R1169",
    },
  ] as const;

  const current = steps[(step - 1) % steps.length];

  return (
    <div
      style={{
        border:       "1px solid #E2E8F0",
        borderRadius: 16,
        overflow:     "hidden",
        height:       520,
        maxWidth:     390,
        position:     "relative",
      }}
    >
      <div style={{ height: "100%", overflowY: "auto" }}>
        <QuestionCard
          step={step}
          totalSteps={2}
          contextLine={current.contextLine}
          question={current.question}
          forwardSignal={current.forwardSignal}
          onBack={step > 1 ? () => { setStep((s) => s - 1); setValue(""); } : undefined}
          onContinue={() => { setStep((s) => Math.min(2, s + 1)); setValue(""); }}
          canContinue={step === 2 || value.trim().length > 0}
          regulationCode={"regulationCode" in current ? current.regulationCode : undefined}
          regulationArticle={"regulationArticle" in current ? current.regulationArticle : undefined}
          regulationExplanation={"regulationExplanation" in current ? current.regulationExplanation : undefined}
          regulationUrl={"regulationUrl" in current ? current.regulationUrl : undefined}
        >
          {step === 1 ? (
            <input
              type="text"
              placeholder="e.g. Original Hot Sauce"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              style={{
                width:        "100%",
                height:       48,
                borderRadius: 10,
                border:       "1.5px solid #E2E8F0",
                paddingLeft:  14,
                paddingRight: 14,
                fontSize:     15,
                color:        "#1E293B",
                outline:      "none",
                fontFamily:   "var(--font-body), DM Sans, sans-serif",
              }}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["Sauce or Condiment", "Beverage", "Snack", "Bakery", "Other"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setValue(cat)}
                  style={{
                    padding:         "12px 16px",
                    borderRadius:    10,
                    border:          value === cat ? "2px solid #2563EB" : "1.5px solid #E2E8F0",
                    backgroundColor: value === cat ? "#EFF6FF" : "white",
                    color:           value === cat ? "#2563EB" : "#1E293B",
                    fontSize:        14,
                    fontWeight:      600,
                    textAlign:       "left",
                    fontFamily:      "var(--font-body), DM Sans, sans-serif",
                    cursor:          "pointer",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </QuestionCard>
      </div>
    </div>
  );
}

function AppShellDemo() {
  return (
    <div
      style={{
        border:       "1px solid #E2E8F0",
        borderRadius: 16,
        overflow:     "hidden",
        height:       420,
        maxWidth:     390,
        position:     "relative",
      }}
    >
      {/* Simulate a phone frame — AppShell uses position:fixed so we fake it */}
      <div style={{ position: "relative", height: "100%", backgroundColor: "#F8FAFC" }}>
        {/* Fake agent bar */}
        <AgentBar message="Your compliance workspace is ready — ask me anything" />

        {/* Content area */}
        <div
          style={{
            padding:      16,
            paddingBottom: 76,
            overflowY:    "auto",
            height:       "calc(100% - 44px - 60px)",
          }}
        >
          <h1
            style={{
              fontSize:   20,
              fontWeight: 700,
              color:      "#1E293B",
              fontFamily: "var(--font-body)",
              marginBottom: 4,
            }}
          >
            Acme Foods Ltd
          </h1>
          <p style={{ fontSize: 13, color: "#64748B", fontFamily: "var(--font-body)", marginBottom: 20 }}>
            Compliance Dashboard
          </p>
          <div
            style={{
              backgroundColor: "white",
              borderRadius:    12,
              padding:         16,
              border:          "1px dashed #CBD5E1",
              textAlign:       "center",
            }}
          >
            <p style={{ fontSize: 13, color: "#94A3B8", fontFamily: "var(--font-body)" }}>
              No actions yet. Add your first product to get started.
            </p>
          </div>
        </div>

        {/* Fake bottom nav */}
        <div
          style={{
            position:        "absolute",
            bottom:          0,
            left:            0,
            right:           0,
            height:          60,
            backgroundColor: "white",
            borderTop:       "1px solid #E2E8F0",
            display:         "flex",
          }}
        >
          {[
            { label: "Dashboard", active: true  },
            { label: "Products",  active: false },
            { label: "Settings",  active: false },
          ].map(({ label, active }) => (
            <div
              key={label}
              style={{
                flex:           1,
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                justifyContent: "center",
                gap:            3,
              }}
            >
              <div
                style={{
                  width:           22,
                  height:          22,
                  borderRadius:    4,
                  backgroundColor: active ? "#EFF6FF" : "#F1F5F9",
                }}
              />
              <span
                style={{
                  fontSize:   10,
                  fontWeight: 600,
                  color:      active ? "#2563EB" : "#94A3B8",
                  fontFamily: "var(--font-body)",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DesignPage() {
  return (
    <div
      style={{
        minHeight:    "100vh",
        backgroundColor: "#F8FAFC",
        padding:      "32px 20px 80px",
        maxWidth:     800,
        margin:       "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1
          style={{
            fontSize:   28,
            fontWeight: 800,
            color:      "#1E293B",
            fontFamily: "var(--font-display), Outfit, sans-serif",
            marginBottom: 6,
          }}
        >
          Design System
        </h1>
        <p
          style={{
            fontSize:   14,
            color:      "#64748B",
            fontFamily: "var(--font-body), DM Sans, sans-serif",
          }}
        >
          FoodComply component library — development reference only
        </p>
      </div>

      {/* ── 1. Typography ────────────────────────────────────────── */}
      <Section title="1 — Typography">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { text: "Display 800 — Outfit",          size: 28, weight: 800, family: "var(--font-display), Outfit, sans-serif" },
            { text: "Display 700 — Outfit",          size: 22, weight: 700, family: "var(--font-display), Outfit, sans-serif" },
            { text: "Body 700 — DM Sans",            size: 16, weight: 700, family: "var(--font-body), DM Sans, sans-serif" },
            { text: "Body 600 — DM Sans",            size: 15, weight: 600, family: "var(--font-body), DM Sans, sans-serif" },
            { text: "Body 500 — DM Sans",            size: 14, weight: 500, family: "var(--font-body), DM Sans, sans-serif" },
            { text: "Body 400 — DM Sans",            size: 13, weight: 400, family: "var(--font-body), DM Sans, sans-serif" },
            { text: "LABEL 600 UPPERCASE — DM Sans", size: 11, weight: 600, family: "var(--font-body), DM Sans, sans-serif", upper: true },
            { text: "LABEL 700 UPPERCASE — DM Sans", size: 10, weight: 700, family: "var(--font-body), DM Sans, sans-serif", upper: true },
          ].map(({ text, size, weight, family, upper }) => (
            <span
              key={text}
              style={{
                fontSize:      size,
                fontWeight:    weight,
                fontFamily:    family,
                color:         "#1E293B",
                textTransform: upper ? "uppercase" : undefined,
                letterSpacing: upper ? "0.07em" : undefined,
              }}
            >
              {text}
            </span>
          ))}
        </div>
      </Section>

      {/* ── 2. Colour palette ────────────────────────────────────── */}
      <Section title="2 — Colour Palette">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <Swatch hex="#2563EB" name="primary" />
          <Swatch hex="#EFF6FF" name="primary.light" />
          <Swatch hex="#BFDBFE" name="primary.mid" />
          <Swatch hex="#16A34A" name="success" />
          <Swatch hex="#F0FDF4" name="success.light" />
          <Swatch hex="#D97706" name="warning" />
          <Swatch hex="#FFFBEB" name="warning.light" />
          <Swatch hex="#DC2626" name="danger" />
          <Swatch hex="#FEF2F2" name="danger.light" />
          <Swatch hex="#1E293B" name="dark" />
          <Swatch hex="#475569" name="mid" />
          <Swatch hex="#64748B" name="light" />
          <Swatch hex="#94A3B8" name="pale" />
          <Swatch hex="#E2E8F0" name="border" />
          <Swatch hex="#F8FAFC" name="bg" />
        </div>
      </Section>

      {/* ── 3. ScoreGauge ────────────────────────────────────────── */}
      <Section title="3 — ScoreGauge">
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: "#94A3B8", fontFamily: "var(--font-body)", marginBottom: 12 }}>
            All scores × all sizes
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-end" }}>
            {[0, 15, 45, 80, 95, 100].map((score) => (
              <div key={score} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <ScoreGauge score={score} size="lg" />
                <ScoreGauge score={score} size="md" />
                <ScoreGauge score={score} size="sm" />
                <span style={{ fontSize: 10, color: "#94A3B8", fontFamily: "var(--font-body)" }}>
                  score {score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── 4. StatusBadge ───────────────────────────────────────── */}
      <Section title="4 — StatusBadge">
        <Row label="draft">
          <StatusBadge status="draft" />
        </Row>
        <Row label="in_review">
          <StatusBadge status="in_review" />
        </Row>
        <Row label="approved">
          <StatusBadge status="approved" />
        </Row>
        <Row label="archived">
          <StatusBadge status="archived" />
        </Row>
      </Section>

      {/* ── 5. ComplianceAnchor ──────────────────────────────────── */}
      <Section title="5 — ComplianceAnchor">
        <Row label="EU 1169/2011">
          <ComplianceAnchor
            code="EU 1169/2011"
            article="Article 9 — Mandatory particulars"
            explanation="All food sold in the EU must display certain mandatory information on the label, including the product name, ingredients list, allergens, net quantity, and nutritional declaration."
            url="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011R1169"
          />
        </Row>
        <Row label="EU 1924/2006">
          <ComplianceAnchor
            code="EU 1924/2006"
            article="Nutrition and Health Claims"
            explanation="Any nutrition or health claim made on food packaging must be authorised and must meet specific conditions. Claims like 'high in protein' or 'low fat' are strictly regulated."
            url="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32006R1924"
          />
        </Row>
        <Row label="EU 2018/848">
          <ComplianceAnchor
            code="EU 2018/848"
            article="Organic Production Regulation"
            explanation="Products labelled as organic must comply with strict production, processing, and certification rules. The EU organic logo can only be used with valid certification."
            url="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018R0848"
          />
        </Row>
      </Section>

      {/* ── 6. AutoFillBadge ─────────────────────────────────────── */}
      <Section title="6 — AutoFillBadge">
        <Row label="from org">
          <AutoFillBadge source="your organisation settings" />
        </Row>
        <Row label="from step">
          <AutoFillBadge source="allergen step" />
        </Row>
      </Section>

      {/* ── 7. TaskRow ───────────────────────────────────────────── */}
      <Section title="7 — TaskRow">
        <p style={{ fontSize: 12, color: "#94A3B8", fontFamily: "var(--font-body)", marginBottom: 12 }}>
          Tap checkboxes to toggle. Tap chevrons to expand help text.
        </p>
        <TaskRowDemo />
      </Section>

      {/* ── 8. CategoryBar ───────────────────────────────────────── */}
      <Section title="8 — CategoryBar">
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 400 }}>
          <CategoryBar label="Formula"    percentage={80} color="#2563EB" />
          <CategoryBar label="Compliance" percentage={45} color="#D97706" />
          <CategoryBar label="Documents"  percentage={20} color="#DC2626" />
          <CategoryBar label="Suppliers"  percentage={100} color="#16A34A" />
          <CategoryBar label="Packaging"  percentage={60} color="#2563EB" />
        </div>
      </Section>

      {/* ── 9. QuestionCard ──────────────────────────────────────── */}
      <Section title="9 — QuestionCard">
        <p style={{ fontSize: 12, color: "#94A3B8", fontFamily: "var(--font-body)", marginBottom: 16 }}>
          Interactive 2-step demo. Scroll inside the card.
        </p>
        <QuestionCardDemo />
      </Section>

      {/* ── 10. AgentBar ─────────────────────────────────────────── */}
      <Section title="10 — AgentBar">
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 500 }}>
          <AgentBar
            message="Your compliance workspace is ready — ask me anything"
            onClick={() => alert("Agent panel would open here")}
          />
          <AgentBar
            message="3 tasks need your attention before your product is ready to launch"
            onClick={() => alert("Agent panel would open here")}
          />
          <AgentBar message="All products are compliant — great work!" />
        </div>
      </Section>

      {/* ── 11. AppShell ─────────────────────────────────────────── */}
      <Section title="11 — AppShell (simulated frame)">
        <p style={{ fontSize: 12, color: "#94A3B8", fontFamily: "var(--font-body)", marginBottom: 16 }}>
          The real AppShell uses position:fixed so it is rendered in a phone-frame simulation here.
        </p>
        <AppShellDemo />
      </Section>

      {/* Footer */}
      <p
        style={{
          fontSize:   11,
          color:      "#CBD5E1",
          fontFamily: "var(--font-body)",
          textAlign:  "center",
          marginTop:  48,
        }}
      >
        FoodComply Design System — development only
      </p>
    </div>
  );
}

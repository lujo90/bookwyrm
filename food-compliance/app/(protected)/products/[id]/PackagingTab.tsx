"use client";

import { useState, useCallback } from "react";
import ComplianceAnchor from "@/components/ui/ComplianceAnchor";
import type { Packaging, BarcodeType, ScoreResult } from "@/types/database";
import type { DocumentWithUrl } from "@/components/ui/DocumentRow";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIMARY_MATERIALS = [
  "Glass",
  "PET Plastic",
  "HDPE Plastic",
  "PP Plastic",
  "Aluminium",
  "Tin Steel",
  "Card and Paperboard",
  "Flexible Film",
  "Other",
];

const RECYCLABILITY_CODES = [
  { value: "01", label: "01 — PET" },
  { value: "02", label: "02 — HDPE" },
  { value: "03", label: "03 — PVC" },
  { value: "04", label: "04 — LDPE" },
  { value: "05", label: "05 — PP" },
  { value: "06", label: "06 — PS" },
  { value: "07", label: "07 — Other plastic" },
  { value: "GL", label: "GL — Glass" },
  { value: "ALU", label: "ALU — Aluminium" },
  { value: "PAP", label: "PAP — Paper / Board" },
];

const BARCODE_TYPES: BarcodeType[] = ["EAN-13", "EAN-8", "QR code"];

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width:        "100%",
  height:       44,
  borderRadius: 8,
  border:       "1px solid #CBD5E1",
  padding:      "0 12px",
  fontSize:     14,
  color:        "#1E293B",
  fontFamily:   "var(--font-body), DM Sans, sans-serif",
  background:   "white",
  boxSizing:    "border-box",
};

const labelStyle: React.CSSProperties = {
  display:       "block",
  fontSize:      11,
  fontWeight:    700,
  color:         "#64748B",
  fontFamily:    "var(--font-body), DM Sans, sans-serif",
  marginBottom:  4,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const sectionHeadStyle: React.CSSProperties = {
  fontSize:      11,
  fontWeight:    700,
  color:         "#64748B",
  fontFamily:    "var(--font-body), DM Sans, sans-serif",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  margin:        "0 0 12px",
};

const helpTextStyle: React.CSSProperties = {
  fontSize:   12,
  color:      "#64748B",
  fontFamily: "var(--font-body), DM Sans, sans-serif",
  lineHeight: 1.5,
  margin:     "6px 0 0",
};

const sectionCardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius:    12,
  border:          "1px solid #E2E8F0",
  padding:         16,
  marginBottom:    12,
};

// ─── ToggleGroup ──────────────────────────────────────────────────────────────

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  colorMap,
}: {
  options:  T[];
  value:    T | null;
  onChange: (v: T) => void;
  colorMap?: Partial<Record<T, { bg: string; color: string; border: string }>>;
}) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map((opt) => {
        const active  = value === opt;
        const colors  = active && colorMap?.[opt];
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              flex:            1,
              height:          40,
              borderRadius:    8,
              border:          active && colors ? `1.5px solid ${colors.border}` : "1.5px solid #CBD5E1",
              backgroundColor: active && colors ? colors.bg    : active ? "#EFF6FF" : "white",
              color:           active && colors ? colors.color : active ? "#2563EB" : "#475569",
              fontSize:        13,
              fontWeight:      active ? 700 : 500,
              fontFamily:      "var(--font-body), DM Sans, sans-serif",
              cursor:          "pointer",
              whiteSpace:      "nowrap",
              transition:      "all 0.15s ease",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PackagingTabProps {
  productId:        string;
  initialPackaging: Packaging | null;
  labelArtworkDocs: DocumentWithUrl[];
  onScoreChange:    (score: ScoreResult) => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PackagingTab({
  productId,
  initialPackaging,
  labelArtworkDocs,
  onScoreChange,
}: PackagingTabProps) {
  // ── Form state (initialised from server data) ─────────────────────────────
  const p = initialPackaging;

  const [primaryMaterial,    setPrimaryMaterial]    = useState(p?.primary_material    ?? "");
  const [weightPrimary,      setWeightPrimary]      = useState(p?.weight_primary_g?.toString()    ?? "");
  const [recyclabilityCode,  setRecyclabilityCode]  = useState(p?.recyclability_code  ?? "");
  const [secondaryMaterial,  setSecondaryMaterial]  = useState(p?.secondary_material  ?? "");
  const [weightSecondary,    setWeightSecondary]    = useState(p?.weight_secondary_g?.toString()  ?? "");

  // PPWR compliant: true → "Yes", false → "No", null → "Not sure"
  const ppwrInitial: "Yes" | "No" | "Not sure" | null =
    p?.ppwr_compliant === true  ? "Yes"      :
    p?.ppwr_compliant === false ? "No"       :
    p?.ppwr_compliant === null  ? "Not sure" : null;
  const [ppwrCompliant,      setPpwrCompliant]      = useState<"Yes" | "No" | "Not sure" | null>(ppwrInitial);
  const [recycledContent,    setRecycledContent]    = useState(p?.recycled_content_pct?.toString() ?? "");

  const [labelDimensions,    setLabelDimensions]    = useState(p?.label_dimensions    ?? "");
  const [labelDocId,         setLabelDocId]         = useState(p?.label_document_id   ?? "");
  const [barcode,            setBarcode]            = useState(p?.barcode             ?? "");
  const [barcodeType,        setBarcodeType]        = useState<BarcodeType>(p?.barcode_type ?? "EAN-13");

  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  // ── Barcode validation ─────────────────────────────────────────────────────
  const barcodeError =
    barcodeType === "EAN-13" && barcode.length > 0 && !/^\d{13}$/.test(barcode)
      ? "EAN-13 must be exactly 13 digits"
      : barcodeType === "EAN-8" && barcode.length > 0 && !/^\d{8}$/.test(barcode)
      ? "EAN-8 must be exactly 8 digits"
      : null;

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (barcodeError) return;
    setSaving(true);
    setError(null);

    const ppwrBool =
      ppwrCompliant === "Yes"      ? true  :
      ppwrCompliant === "No"       ? false :
      ppwrCompliant === "Not sure" ? null  : null;

    const body: Partial<Omit<Packaging, "id" | "created_at" | "updated_at">> = {
      primary_material:    primaryMaterial   || null,
      weight_primary_g:    weightPrimary     ? parseFloat(weightPrimary)   : null,
      recyclability_code:  recyclabilityCode || null,
      secondary_material:  secondaryMaterial || null,
      weight_secondary_g:  weightSecondary   ? parseFloat(weightSecondary) : null,
      ppwr_compliant:      ppwrBool,
      recycled_content_pct: recycledContent  ? parseFloat(recycledContent) : null,
      label_dimensions:    labelDimensions   || null,
      label_document_id:   labelDocId        || null,
      barcode:             barcode           || null,
      barcode_type:        barcodeType,
    };

    try {
      const res = await fetch(`/api/products/${productId}/packaging`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      const { score } = await res.json();
      onScoreChange(score);
      setSaveMsg("Saved");
      setTimeout(() => setSaveMsg(null), 2000);
    } catch {
      setError("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [
    productId, barcodeError, primaryMaterial, weightPrimary, recyclabilityCode,
    secondaryMaterial, weightSecondary, ppwrCompliant, recycledContent,
    labelDimensions, labelDocId, barcode, barcodeType, onScoreChange,
  ]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ backgroundColor: "#F8FAFC", padding: "12px 16px 32px" }}>

      {/* ── Section 1: Primary Packaging ─────────────────────────────── */}
      <div style={sectionCardStyle}>
        <p style={sectionHeadStyle}>Primary Packaging</p>

        <label style={labelStyle}>Primary material</label>
        <select
          value={primaryMaterial}
          onChange={(e) => setPrimaryMaterial(e.target.value)}
          style={{ ...inputStyle, cursor: "pointer", marginBottom: 12 }}
        >
          <option value="">— Select material —</option>
          {PRIMARY_MATERIALS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <label style={labelStyle}>Weight of primary packaging (g)</label>
        <input
          type="number"
          min="0"
          step="0.1"
          value={weightPrimary}
          onChange={(e) => setWeightPrimary(e.target.value)}
          placeholder="e.g. 45"
          style={{ ...inputStyle, marginBottom: 12 }}
        />

        <label style={labelStyle}>Recyclability code</label>
        <select
          value={recyclabilityCode}
          onChange={(e) => setRecyclabilityCode(e.target.value)}
          style={{ ...inputStyle, cursor: "pointer", marginBottom: 8 }}
        >
          <option value="">— Select code —</option>
          {RECYCLABILITY_CODES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <div style={{ marginBottom: 4 }}>
          <ComplianceAnchor
            code="EU 2022/1616"
            article="Article 7 — Recyclability labelling"
            explanation="EU PPWR (Packaging and Packaging Waste Regulation) requires all packaging placed on the EU market to display recyclability information. Mandatory from 2025."
            url="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32022R1616"
          />
        </div>
        <p style={helpTextStyle}>
          EU PPWR requires all packaging to display recyclability information from 2025.
        </p>
      </div>

      {/* ── Section 2: Secondary Packaging ───────────────────────────── */}
      <div style={sectionCardStyle}>
        <p style={sectionHeadStyle}>Secondary Packaging</p>

        <label style={labelStyle}>Secondary material</label>
        <input
          type="text"
          value={secondaryMaterial}
          onChange={(e) => setSecondaryMaterial(e.target.value)}
          placeholder="e.g. Cardboard outer, Shrink wrap"
          style={{ ...inputStyle, marginBottom: 12 }}
        />

        <label style={labelStyle}>Weight of secondary packaging (g)</label>
        <input
          type="number"
          min="0"
          step="0.1"
          value={weightSecondary}
          onChange={(e) => setWeightSecondary(e.target.value)}
          placeholder="e.g. 120"
          style={inputStyle}
        />
      </div>

      {/* ── Section 3: PPWR Compliance ───────────────────────────────── */}
      <div style={sectionCardStyle}>
        <p style={sectionHeadStyle}>PPWR Compliance</p>

        <label style={{ ...labelStyle, marginBottom: 8 }}>PPWR compliant?</label>
        <ToggleGroup
          options={["Yes", "No", "Not sure"] as const}
          value={ppwrCompliant}
          onChange={setPpwrCompliant}
          colorMap={{
            Yes:      { bg: "#F0FDF4", color: "#16A34A", border: "#86EFAC" },
            No:       { bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
            "Not sure": { bg: "#F8FAFC", color: "#475569", border: "#CBD5E1" },
          }}
        />

        <label style={{ ...labelStyle, marginTop: 12 }}>Recycled content (%)</label>
        <input
          type="number"
          min="0"
          max="100"
          step="1"
          value={recycledContent}
          onChange={(e) => setRecycledContent(e.target.value)}
          placeholder="e.g. 30"
          style={{ ...inputStyle, marginBottom: 8 }}
        />

        <div style={{ marginBottom: 4 }}>
          <ComplianceAnchor
            code="EU 2022/1616"
            article="Article 9 — Recycled content targets"
            explanation="From 2030, the EU PPWR sets minimum recycled content requirements for plastic packaging. Recording your current recycled content now prepares you for the transition."
            url="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32022R1616"
          />
        </div>
        <p style={helpTextStyle}>
          From 2030, minimum recycled content requirements apply. Recording this now
          prepares you for the transition.
        </p>
      </div>

      {/* ── Section 4: Label & Barcode ───────────────────────────────── */}
      <div style={sectionCardStyle}>
        <p style={sectionHeadStyle}>Label & Barcode</p>

        <label style={labelStyle}>Label dimensions</label>
        <input
          type="text"
          value={labelDimensions}
          onChange={(e) => setLabelDimensions(e.target.value)}
          placeholder="e.g. 80mm × 120mm"
          style={{ ...inputStyle, marginBottom: 12 }}
        />

        <label style={labelStyle}>Label artwork document</label>
        <select
          value={labelDocId}
          onChange={(e) => setLabelDocId(e.target.value)}
          style={{ ...inputStyle, cursor: "pointer", marginBottom: 12 }}
        >
          <option value="">— Select label artwork —</option>
          {labelArtworkDocs.map((doc) => (
            <option key={doc.id} value={doc.id}>{doc.name}</option>
          ))}
        </select>
        {labelArtworkDocs.length === 0 && (
          <p style={{ ...helpTextStyle, marginTop: -8, marginBottom: 12 }}>
            Upload a label artwork document in the Documents tab to link it here.
          </p>
        )}

        <label style={labelStyle}>Barcode type</label>
        <div style={{ marginBottom: 12 }}>
          <ToggleGroup
            options={BARCODE_TYPES}
            value={barcodeType}
            onChange={setBarcodeType}
          />
        </div>

        <label style={labelStyle}>Barcode</label>
        <input
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value.replace(/\D/g, "").slice(0, barcodeType === "EAN-8" ? 8 : barcodeType === "EAN-13" ? 13 : 50))}
          placeholder={barcodeType === "EAN-13" ? "13-digit EAN-13" : barcodeType === "EAN-8" ? "8-digit EAN-8" : "QR code value"}
          style={{
            ...inputStyle,
            borderColor: barcodeError ? "#DC2626" : "#CBD5E1",
          }}
        />
        {barcodeError && (
          <p style={{ fontSize: 12, color: "#DC2626", fontFamily: "var(--font-body), DM Sans, sans-serif", margin: "4px 0 0" }}>
            {barcodeError}
          </p>
        )}
      </div>

      {/* ── Save button ──────────────────────────────────────────────── */}
      {error && (
        <p style={{ fontSize: 13, color: "#DC2626", fontFamily: "var(--font-body), DM Sans, sans-serif", margin: "0 0 10px", textAlign: "center" }}>
          {error}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving || !!barcodeError}
        style={{
          width:           "100%",
          height:          52,
          borderRadius:    12,
          border:          "none",
          backgroundColor: saveMsg === "Saved" ? "#16A34A" : "#2563EB",
          color:           "white",
          fontSize:        15,
          fontWeight:      800,
          fontFamily:      "var(--font-display), Outfit, sans-serif",
          cursor:          (saving || !!barcodeError) ? "not-allowed" : "pointer",
          opacity:         (saving || !!barcodeError) ? 0.7 : 1,
          transition:      "background-color 0.2s ease",
        }}
      >
        {saving ? "Saving…" : saveMsg === "Saved" ? "Saved ✓" : "Save packaging"}
      </button>
    </div>
  );
}

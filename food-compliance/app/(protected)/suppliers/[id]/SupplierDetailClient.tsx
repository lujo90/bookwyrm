"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, X } from "lucide-react";
import type { Supplier, SupplyChainEvent, RiskRating } from "@/types/database";

interface Props {
  initialSupplier: Supplier;
  ingredients: {
    id: string; name: string; percentage: number;
    allergen_codes: string[]; formula_id: string;
  }[];
  events: SupplyChainEvent[];
}

// ─── Field input helper ───────────────────────────────────────────────────────

const inputStyle = {
  width:        "100%",
  height:       44,
  borderRadius: 8,
  border:       "1px solid #CBD5E1",
  padding:      "0 12px",
  fontSize:     14,
  color:        "#1E293B",
  fontFamily:   "var(--font-body), DM Sans, sans-serif",
  background:   "white",
  boxSizing:    "border-box" as const,
};

const labelStyle = {
  display:       "block",
  fontSize:      11,
  fontWeight:    700,
  color:         "#64748B",
  fontFamily:    "var(--font-body), DM Sans, sans-serif",
  marginBottom:  4,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
};

const sectionHeadStyle = {
  fontSize:      11,
  fontWeight:    700,
  color:         "#64748B",
  fontFamily:    "var(--font-body), DM Sans, sans-serif",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  margin:        "0 0 10px",
};

// ─── Revoke confirm panel ─────────────────────────────────────────────────────

function RevokeConfirm({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel:  () => void;
  loading:   boolean;
}) {
  return (
    <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "14px 16px", marginTop: 12 }}>
      <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#991B1B", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>
        Revoke supplier approval?
      </p>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#DC2626", fontFamily: "var(--font-body), DM Sans, sans-serif", lineHeight: 1.5 }}>
        This will reset compliance checklist items across all products that use ingredients from this supplier.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, height: 38, borderRadius: 7, border: "1px solid #FECACA", background: "white", fontSize: 13, fontWeight: 600, color: "#64748B", fontFamily: "var(--font-body), DM Sans, sans-serif", cursor: "pointer" }}>
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading} style={{ flex: 2, height: 38, borderRadius: 7, border: "none", backgroundColor: "#DC2626", color: "white", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body), DM Sans, sans-serif", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Revoking…" : "Confirm Revoke"}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SupplierDetailClient({ initialSupplier, ingredients, events }: Props) {
  const router   = useRouter();
  const [supplier, setSupplier] = useState<Supplier>(initialSupplier);

  // Editable fields
  const [name,    setName]    = useState(supplier.name);
  const [country, setCountry] = useState(supplier.country ?? "");
  const [email,   setEmail]   = useState(supplier.contact_email ?? "");
  const [risk,    setRisk]    = useState<RiskRating>(supplier.risk_rating as RiskRating);
  const [notes,   setNotes]   = useState(supplier.notes ?? "");
  const [reviewDate, setReviewDate] = useState(supplier.review_date ?? "");

  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Approval UI state
  const [approving, setApproving] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [cascadeResult, setCascadeResult] = useState<{ affectedProducts: number; itemsReset: number } | null>(null);

  // Certifications
  const [certifications, setCertifications] = useState<string[]>(supplier.certifications);
  const [newCert, setNewCert] = useState("");

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name, country, contact_email: email,
          risk_rating: risk, notes,
          review_date: reviewDate || null,
          certifications,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const { supplier: updated } = await res.json();
      setSupplier(updated as Supplier);
      setSaveMsg("Saved");
      setTimeout(() => setSaveMsg(null), 2000);
    } catch {
      setSaveMsg("Save failed");
    } finally {
      setSaving(false);
    }
  }, [supplier.id, name, country, email, risk, notes, reviewDate, certifications]);

  const handleApprove = useCallback(async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const { supplier: updated } = await res.json();
      setSupplier(updated as Supplier);
    } catch { /* keep UI */ }
    finally { setApproving(false); }
  }, [supplier.id]);

  const handleRevoke = useCallback(async () => {
    setRevoking(true);
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}/approve`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      const { supplier: updated, cascade } = await res.json();
      setSupplier(updated as Supplier);
      setShowRevokeConfirm(false);
      setCascadeResult(cascade);
    } catch { /* keep UI */ }
    finally { setRevoking(false); }
  }, [supplier.id]);

  const addCert = () => {
    const cert = newCert.trim().toUpperCase();
    if (!cert || certifications.includes(cert)) return;
    setCertifications((prev) => [...prev, cert]);
    setNewCert("");
  };

  const removeCert = (cert: string) => {
    setCertifications((prev) => prev.filter((c) => c !== cert));
  };

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div style={{ backgroundColor: "#F8FAFC", minHeight: "100%", paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ backgroundColor: "white", borderBottom: "1px solid #E2E8F0", padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => router.push("/suppliers")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#64748B", display: "flex", alignItems: "center" }}>
            <ChevronLeft size={20} />
          </button>
          <h1 style={{ flex: 1, fontSize: 18, fontWeight: 700, color: "#1E293B", fontFamily: "var(--font-body), DM Sans, sans-serif", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {supplier.name}
          </h1>
          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "3px 8px", borderRadius: 20, backgroundColor: supplier.approved ? "#F0FDF4" : "#FEF2F2", color: supplier.approved ? "#16A34A" : "#DC2626", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>
            {supplier.approved ? "Approved" : "Not approved"}
          </span>
        </div>
      </div>

      {/* Cascade result banner */}
      {cascadeResult && (
        <div style={{ backgroundColor: "#FFFBEB", borderBottom: "1px solid #FDE68A", padding: "10px 16px" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#92400E", fontFamily: "var(--font-body), DM Sans, sans-serif", fontWeight: 500 }}>
            Cascade complete — {cascadeResult.affectedProducts} product(s) affected, {cascadeResult.itemsReset} checklist item(s) reset.
          </p>
        </div>
      )}

      <div style={{ padding: "16px 16px 0" }}>

        {/* ── Details ────────────────────────────────────────────────── */}
        <div style={{ backgroundColor: "white", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid #E2E8F0" }}>
          <p style={sectionHeadStyle}>Details</p>

          <label style={labelStyle}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />

          <label style={labelStyle}>Country</label>
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Germany" style={{ ...inputStyle, marginBottom: 10 }} />

          <label style={labelStyle}>Contact email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={{ ...inputStyle, marginBottom: 10 }} />

          <label style={labelStyle}>Risk rating</label>
          <select value={risk} onChange={(e) => setRisk(e.target.value as RiskRating)} style={{ ...inputStyle, marginBottom: 10, cursor: "pointer" }}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <label style={labelStyle}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ ...inputStyle, height: "auto", padding: "10px 12px", resize: "vertical", marginBottom: 12 }}
            placeholder="Optional notes about this supplier…"
          />

          <button onClick={handleSave} disabled={saving} style={{ width: "100%", height: 44, borderRadius: 8, border: "none", backgroundColor: saveMsg === "Saved" ? "#16A34A" : "#2563EB", color: "white", fontSize: 14, fontWeight: 700, fontFamily: "var(--font-body), DM Sans, sans-serif", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, transition: "background-color 0.2s ease" }}>
            {saving ? "Saving…" : saveMsg ?? "Save changes"}
          </button>
        </div>

        {/* ── Approval ────────────────────────────────────────────────── */}
        <div style={{ backgroundColor: "white", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid #E2E8F0" }}>
          <p style={sectionHeadStyle}>Approval</p>

          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <label style={{ ...labelStyle, margin: 0 }}>Review date</label>
          </div>
          <input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />

          {supplier.approval_date && (
            <p style={{ fontSize: 12, color: "#64748B", fontFamily: "var(--font-body), DM Sans, sans-serif", margin: "0 0 12px" }}>
              Approved on {formatDate(supplier.approval_date)}
            </p>
          )}

          {!supplier.approved ? (
            <button onClick={handleApprove} disabled={approving} style={{ width: "100%", height: 44, borderRadius: 8, border: "none", backgroundColor: "#16A34A", color: "white", fontSize: 14, fontWeight: 700, fontFamily: "var(--font-body), DM Sans, sans-serif", cursor: approving ? "not-allowed" : "pointer", opacity: approving ? 0.7 : 1 }}>
              {approving ? "Approving…" : "Approve supplier"}
            </button>
          ) : (
            <>
              <button onClick={() => setShowRevokeConfirm(true)} style={{ width: "100%", height: 44, borderRadius: 8, border: "1px solid #FECACA", backgroundColor: "white", color: "#DC2626", fontSize: 14, fontWeight: 700, fontFamily: "var(--font-body), DM Sans, sans-serif", cursor: "pointer" }}>
                Revoke approval
              </button>
              {showRevokeConfirm && (
                <RevokeConfirm
                  onConfirm={handleRevoke}
                  onCancel={() => setShowRevokeConfirm(false)}
                  loading={revoking}
                />
              )}
            </>
          )}
        </div>

        {/* ── Certifications ──────────────────────────────────────────── */}
        <div style={{ backgroundColor: "white", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid #E2E8F0" }}>
          <p style={sectionHeadStyle}>Certifications</p>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: certifications.length > 0 ? 10 : 0 }}>
            {certifications.map((cert) => (
              <span key={cert} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, padding: "4px 8px", borderRadius: 20, backgroundColor: "#DBEAFE", color: "#1D4ED8", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>
                {cert}
                <button onClick={() => removeCert(cert)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#1D4ED8", display: "flex", alignItems: "center" }}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              value={newCert}
              onChange={(e) => setNewCert(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCert()}
              placeholder="e.g. BRC, IFS, ORGANIC"
              style={{ ...inputStyle, flex: 1, marginBottom: 0, textTransform: "uppercase" }}
            />
            <button onClick={addCert} style={{ height: 44, paddingLeft: 14, paddingRight: 14, borderRadius: 8, border: "none", backgroundColor: "#2563EB", color: "white", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body), DM Sans, sans-serif", cursor: "pointer", flexShrink: 0 }}>
              Add
            </button>
          </div>

          {certifications.length !== (initialSupplier.certifications?.length ?? 0) && (
            <button onClick={handleSave} disabled={saving} style={{ marginTop: 10, width: "100%", height: 40, borderRadius: 8, border: "none", backgroundColor: "#2563EB", color: "white", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-body), DM Sans, sans-serif", cursor: "pointer" }}>
              Save certifications
            </button>
          )}
        </div>

        {/* ── Ingredients supplied ────────────────────────────────────── */}
        {ingredients.length > 0 && (
          <div style={{ backgroundColor: "white", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid #E2E8F0" }}>
            <p style={sectionHeadStyle}>Ingredients supplied ({ingredients.length})</p>
            {ingredients.map((ing) => (
              <div key={ing.id} style={{ borderBottom: "1px solid #F1F5F9", padding: "8px 0", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#1E293B", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>{ing.name}</span>
                <span style={{ fontSize: 12, color: "#64748B", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>{ing.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}

        {/* ── History ─────────────────────────────────────────────────── */}
        {events.length > 0 && (
          <div style={{ backgroundColor: "white", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid #E2E8F0" }}>
            <p style={sectionHeadStyle}>History</p>
            {events.map((ev) => (
              <div key={ev.id} style={{ borderBottom: "1px solid #F1F5F9", padding: "8px 0" }}>
                <p style={{ margin: "0 0 2px", fontSize: 13, color: "#1E293B", fontFamily: "var(--font-body), DM Sans, sans-serif", fontWeight: 500 }}>
                  {ev.description ?? ev.event_type}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "#94A3B8", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>
                  {formatDate(ev.created_at)}
                  {ev.resolved_at && ` · Resolved ${formatDate(ev.resolved_at)}`}
                </p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

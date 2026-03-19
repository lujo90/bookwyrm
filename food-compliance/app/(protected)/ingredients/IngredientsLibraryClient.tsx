"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Search, X } from "lucide-react";
import IngredientRow from "@/components/ui/IngredientRow";
import type { IngredientWithSupplier } from "@/app/api/ingredients/route";
import type { Supplier } from "@/types/database";

interface Props {
  initialIngredients: IngredientWithSupplier[];
  suppliers:          Supplier[];
}

// ─── Edit drawer ──────────────────────────────────────────────────────────────

function IngredientEditDrawer({
  ingredient,
  suppliers,
  onSave,
  onClose,
}: {
  ingredient: IngredientWithSupplier;
  suppliers:  Supplier[];
  onSave:     (updated: IngredientWithSupplier) => void;
  onClose:    () => void;
}) {
  const [supplierId, setSupplierId]   = useState(ingredient.supplier_id ?? "");
  const [reviewDue,  setReviewDue]    = useState(ingredient.review_due_at ?? "");
  const [saving,     setSaving]       = useState(false);
  const [error,      setError]        = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/ingredients/${ingredient.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          supplier_id:   supplierId || null,
          review_due_at: reviewDue  || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const { ingredient: updated } = await res.json();

      // Merge in supplier display fields
      const selectedSupplier = suppliers.find((s) => s.id === supplierId);
      const merged: IngredientWithSupplier = {
        ...updated,
        supplier_name:     selectedSupplier?.name    ?? null,
        supplier_country:  selectedSupplier?.country ?? null,
        supplier_approved: selectedSupplier?.approved ?? null,
        coa_expiry_date:   ingredient.coa_expiry_date,
      };
      onSave(merged);
    } catch {
      setError("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.3)" }}>
      <div style={{ backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: "20px 16px 32px" }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", margin: "0 auto 16px" }} />

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <p style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 700, color: "#1E293B", fontFamily: "var(--font-body), DM Sans, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {ingredient.name}
          </p>
          <button onClick={onClose} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", color: "#94A3B8", display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        <label style={labelStyle}>Supplier</label>
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={{ ...inputStyle, marginBottom: 12, cursor: "pointer" }}>
          <option value="">— No supplier —</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.approved ? "✓" : "(not approved)"}
            </option>
          ))}
        </select>

        <label style={labelStyle}>Next review date</label>
        <input type="date" value={reviewDue} onChange={(e) => setReviewDue(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }} />

        {error && (
          <p style={{ fontSize: 12, color: "#DC2626", fontFamily: "var(--font-body), DM Sans, sans-serif", margin: "0 0 10px" }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, height: 44, borderRadius: 8, border: "1px solid #CBD5E1", background: "white", fontSize: 14, fontWeight: 600, color: "#64748B", fontFamily: "var(--font-body), DM Sans, sans-serif", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, height: 44, borderRadius: 8, border: "none", backgroundColor: "#2563EB", color: "white", fontSize: 14, fontWeight: 700, fontFamily: "var(--font-body), DM Sans, sans-serif", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export default function IngredientsLibraryClient({ initialIngredients, suppliers }: Props) {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<IngredientWithSupplier[]>(initialIngredients);
  const [search, setSearch]           = useState("");
  const [editing, setEditing]         = useState<IngredientWithSupplier | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return ingredients;
    const q = search.toLowerCase();
    return ingredients.filter(
      (ing) =>
        ing.name.toLowerCase().includes(q) ||
        (ing.supplier_name ?? "").toLowerCase().includes(q),
    );
  }, [ingredients, search]);

  const handleSave = useCallback((updated: IngredientWithSupplier) => {
    setIngredients((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    setEditing(null);
  }, []);

  // Counts for summary chips
  const noSupplierCount  = ingredients.filter((i) => !i.supplier_id).length;
  const unapprovedCount  = ingredients.filter((i) => i.supplier_id && i.supplier_approved === false).length;

  return (
    <div style={{ backgroundColor: "#F8FAFC", minHeight: "100%" }}>
      {/* Header */}
      <div style={{ backgroundColor: "white", borderBottom: "1px solid #E2E8F0", padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#64748B", display: "flex", alignItems: "center" }}>
            <ChevronLeft size={20} />
          </button>
          <h1 style={{ flex: 1, fontSize: 18, fontWeight: 700, color: "#1E293B", fontFamily: "var(--font-body), DM Sans, sans-serif", margin: 0 }}>
            Ingredients Library
          </h1>
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or supplier…"
            style={{
              width:        "100%",
              height:       38,
              borderRadius: 8,
              border:       "1px solid #CBD5E1",
              paddingLeft:  32,
              paddingRight: 10,
              fontSize:     13,
              color:        "#1E293B",
              fontFamily:   "var(--font-body), DM Sans, sans-serif",
              boxSizing:    "border-box",
              background:   "#F8FAFC",
            }}
          />
        </div>
      </div>

      {/* Summary chips */}
      {(noSupplierCount > 0 || unapprovedCount > 0) && (
        <div style={{ padding: "10px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {noSupplierCount > 0 && (
            <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20, backgroundColor: "#FEF3C7", color: "#92400E", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>
              {noSupplierCount} without supplier
            </span>
          )}
          {unapprovedCount > 0 && (
            <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20, backgroundColor: "#FEF2F2", color: "#DC2626", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>
              {unapprovedCount} unapproved supplier
            </span>
          )}
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ margin: 16, backgroundColor: "white", borderRadius: 12, padding: "32px 24px", textAlign: "center", border: "2px dashed #E2E8F0" }}>
          <p style={{ fontSize: 28, margin: "0 0 8px" }}>🌿</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1E293B", fontFamily: "var(--font-body), DM Sans, sans-serif", margin: "0 0 4px" }}>
            {search ? "No matching ingredients" : "No ingredients yet"}
          </p>
          <p style={{ fontSize: 13, color: "#94A3B8", fontFamily: "var(--font-body), DM Sans, sans-serif", margin: 0 }}>
            {search ? "Try a different search term." : "Ingredients are added when you build formulas for your products."}
          </p>
        </div>
      ) : (
        <div style={{ backgroundColor: "white", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
          {filtered.map((ing) => (
            <IngredientRow key={ing.id} ingredient={ing} onClick={setEditing} />
          ))}
        </div>
      )}

      {/* Edit drawer */}
      {editing && (
        <IngredientEditDrawer
          ingredient={editing}
          suppliers={suppliers}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

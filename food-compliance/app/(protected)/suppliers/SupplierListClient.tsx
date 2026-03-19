"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import SupplierRow from "@/components/ui/SupplierRow";
import type { Supplier } from "@/types/database";

interface Props {
  initialSuppliers: Supplier[];
}

// ─── Inline "Add supplier" form ───────────────────────────────────────────────

function AddSupplierForm({
  onAdd,
  onCancel,
}: {
  onAdd:    (s: Supplier) => void;
  onCancel: () => void;
}) {
  const [name,    setName]    = useState("");
  const [country, setCountry] = useState("");
  const [email,   setEmail]   = useState("");
  const [risk,    setRisk]    = useState<"low" | "medium" | "high">("medium");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/suppliers", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: name.trim(), country, contact_email: email, risk_rating: risk }),
      });
      if (!res.ok) throw new Error("Failed");
      const { supplier } = await res.json();
      onAdd(supplier as Supplier);
    } catch {
      setError("Failed to create supplier. Please try again.");
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
    marginBottom: 10,
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
    <div style={{ backgroundColor: "white", borderBottom: "1px solid #E2E8F0", padding: "16px 16px 20px" }}>
      <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#1E293B", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>
        New Supplier
      </p>

      <label style={labelStyle}>Name *</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Ingredients Ltd" style={inputStyle} />

      <label style={labelStyle}>Country</label>
      <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Germany" style={inputStyle} />

      <label style={labelStyle}>Contact email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="supplier@example.com" style={inputStyle} />

      <label style={labelStyle}>Risk rating</label>
      <select value={risk} onChange={(e) => setRisk(e.target.value as "low" | "medium" | "high")} style={inputStyle}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      {error && (
        <p style={{ fontSize: 12, color: "#DC2626", fontFamily: "var(--font-body), DM Sans, sans-serif", margin: "0 0 10px" }}>{error}</p>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, height: 44, borderRadius: 8, border: "1px solid #CBD5E1", background: "white", fontSize: 14, fontWeight: 600, color: "#64748B", fontFamily: "var(--font-body), DM Sans, sans-serif", cursor: "pointer" }}>
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={saving} style={{ flex: 2, height: 44, borderRadius: 8, border: "none", backgroundColor: "#2563EB", color: "white", fontSize: 14, fontWeight: 700, fontFamily: "var(--font-body), DM Sans, sans-serif", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving…" : "Add Supplier"}
        </button>
      </div>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export default function SupplierListClient({ initialSuppliers }: Props) {
  const router   = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [showForm, setShowForm]   = useState(false);

  const handleAdd = useCallback((supplier: Supplier) => {
    setSuppliers((prev) => [...prev, supplier].sort((a, b) => a.name.localeCompare(b.name)));
    setShowForm(false);
  }, []);

  const handleEdit = useCallback((supplier: Supplier) => {
    router.push(`/suppliers/${supplier.id}`);
  }, [router]);

  return (
    <div style={{ backgroundColor: "#F8FAFC", minHeight: "100%" }}>
      {/* Header */}
      <div style={{ backgroundColor: "white", borderBottom: "1px solid #E2E8F0", padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => router.push("/settings")}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#64748B", display: "flex", alignItems: "center" }}
          >
            <ChevronLeft size={20} />
          </button>
          <h1 style={{ flex: 1, fontSize: 18, fontWeight: 700, color: "#1E293B", fontFamily: "var(--font-body), DM Sans, sans-serif", margin: 0 }}>
            Suppliers
          </h1>
          <button
            onClick={() => setShowForm(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, height: 36, paddingLeft: 12, paddingRight: 12, borderRadius: 8, border: "none", backgroundColor: "#2563EB", color: "white", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body), DM Sans, sans-serif", cursor: "pointer" }}
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <AddSupplierForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />
      )}

      {/* List */}
      {suppliers.length === 0 && !showForm ? (
        <div style={{ margin: 16, backgroundColor: "white", borderRadius: 12, padding: "32px 24px", textAlign: "center", border: "2px dashed #E2E8F0" }}>
          <p style={{ fontSize: 28, margin: "0 0 8px" }}>🏭</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1E293B", fontFamily: "var(--font-body), DM Sans, sans-serif", margin: "0 0 4px" }}>No suppliers yet</p>
          <p style={{ fontSize: 13, color: "#94A3B8", fontFamily: "var(--font-body), DM Sans, sans-serif", margin: "0 0 16px" }}>Add your first supplier to link them to ingredients.</p>
          <button onClick={() => setShowForm(true)} style={{ height: 40, paddingLeft: 16, paddingRight: 16, borderRadius: 8, border: "none", backgroundColor: "#2563EB", color: "white", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body), DM Sans, sans-serif", cursor: "pointer" }}>
            Add Supplier
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: "white", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
          {suppliers.map((s) => (
            <SupplierRow key={s.id} supplier={s} onEdit={handleEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

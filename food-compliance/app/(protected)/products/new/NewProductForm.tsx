"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FONT = "var(--font-body), DM Sans, sans-serif";

const CATEGORIES = [
  { value: "bakery",    label: "Bakery" },
  { value: "beverage",  label: "Beverage" },
  { value: "dairy",     label: "Dairy" },
  { value: "meat",      label: "Meat & Poultry" },
  { value: "seafood",   label: "Seafood" },
  { value: "snack",     label: "Snacks & Confectionery" },
  { value: "condiment", label: "Condiments & Sauces" },
  { value: "ready_meal",label: "Ready Meals" },
  { value: "other",     label: "Other" },
];

const TARGET_MARKETS = [
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "GB", label: "United Kingdom" },
  { value: "IE", label: "Ireland" },
  { value: "NL", label: "Netherlands" },
  { value: "BE", label: "Belgium" },
  { value: "IT", label: "Italy" },
  { value: "ES", label: "Spain" },
  { value: "PL", label: "Poland" },
  { value: "AT", label: "Austria" },
];

export default function NewProductForm() {
  const router = useRouter();
  const [name,    setName]    = useState("");
  const [category,setCategory]= useState("");
  const [markets, setMarkets] = useState<string[]>([]);
  const [sku,     setSku]     = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  function toggleMarket(code: string) {
    setMarkets((prev) =>
      prev.includes(code) ? prev.filter((m) => m !== code) : [...prev, code]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Product name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/products", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:           name.trim(),
          category:       category || null,
          target_markets: markets,
          sku:            sku.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.reason) {
          // Billing gate triggered server-side — redirect to new with gate
          router.push("/products/new");
          return;
        }
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push(`/products/${data.product.id}`);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "16px 16px 40px" }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#1E293B", fontFamily: FONT }}>
        New Product
      </h1>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "#64748B", fontFamily: FONT }}>
        Fill in the basics. You can add formula, documents and more on the product page.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Name */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", fontFamily: FONT, marginBottom: 6 }}>
            Product name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Oat Crunch Granola Bar"
            style={{
              width:       "100%",
              minHeight:   44,
              padding:     "0 12px",
              borderRadius: 8,
              border:      "1.5px solid #CBD5E1",
              fontSize:    14,
              fontFamily:  FONT,
              color:       "#1E293B",
              boxSizing:   "border-box",
              outline:     "none",
            }}
          />
        </div>

        {/* Category */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", fontFamily: FONT, marginBottom: 6 }}>
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              width:       "100%",
              minHeight:   44,
              padding:     "0 12px",
              borderRadius: 8,
              border:      "1.5px solid #CBD5E1",
              fontSize:    14,
              fontFamily:  FONT,
              color:       "#1E293B",
              boxSizing:   "border-box",
              backgroundColor: "white",
              appearance:  "none",
              outline:     "none",
            }}
          >
            <option value="">Select a category…</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Target markets */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", fontFamily: FONT, marginBottom: 8 }}>
            Target markets
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {TARGET_MARKETS.map(({ value, label }) => {
              const selected = markets.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleMarket(value)}
                  style={{
                    minHeight:       36,
                    padding:         "0 14px",
                    borderRadius:    20,
                    border:          `1.5px solid ${selected ? "#2563EB" : "#CBD5E1"}`,
                    backgroundColor: selected ? "#EFF6FF" : "white",
                    color:           selected ? "#2563EB" : "#64748B",
                    fontSize:        13,
                    fontFamily:      FONT,
                    fontWeight:      selected ? 600 : 400,
                    cursor:          "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* SKU */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", fontFamily: FONT, marginBottom: 6 }}>
            SKU <span style={{ fontWeight: 400, color: "#94A3B8" }}>(optional)</span>
          </label>
          <input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="e.g. SKU-001"
            style={{
              width:       "100%",
              minHeight:   44,
              padding:     "0 12px",
              borderRadius: 8,
              border:      "1.5px solid #CBD5E1",
              fontSize:    14,
              fontFamily:  FONT,
              color:       "#1E293B",
              boxSizing:   "border-box",
              outline:     "none",
            }}
          />
        </div>

        {error && (
          <p style={{ margin: 0, fontSize: 13, color: "#DC2626", fontFamily: FONT }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            minHeight:       52,
            backgroundColor: saving ? "#93C5FD" : "#2563EB",
            color:           "white",
            borderRadius:    10,
            border:          "none",
            fontSize:        15,
            fontWeight:      600,
            fontFamily:      FONT,
            cursor:          saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Creating…" : "Create Product"}
        </button>
      </form>
    </div>
  );
}

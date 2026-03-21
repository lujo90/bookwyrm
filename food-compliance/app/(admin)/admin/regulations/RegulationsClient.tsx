"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Regulation } from "@/types/database";

const FONT = "var(--font-body), DM Sans, sans-serif";

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span
      style={{
        display:         "inline-block",
        padding:         "2px 8px",
        borderRadius:    12,
        fontSize:        11,
        fontWeight:      600,
        fontFamily:      FONT,
        backgroundColor: isActive ? "#F0FDF4" : "#F8FAFC",
        color:           isActive ? "#16A34A" : "#94A3B8",
        border:          `1px solid ${isActive ? "#BBF7D0" : "#E2E8F0"}`,
      }}
    >
      {status}
    </span>
  );
}

const EMPTY_FORM = {
  code: "",
  title: "",
  summary: "",
  applies_to: "all",
  markets: "EU",
  official_url: "",
  status: "active",
};

export default function RegulationsClient({
  regulations: initial,
}: {
  regulations: Regulation[];
}) {
  const router = useRouter();
  const [regulations, setRegulations] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/admin/regulations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code:        form.code,
        title:       form.title,
        summary:     form.summary || null,
        applies_to:  form.applies_to.split(",").map((s) => s.trim()).filter(Boolean),
        markets:     form.markets.split(",").map((s) => s.trim()).filter(Boolean),
        official_url: form.official_url || null,
        status:      form.status,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to create regulation");
      setSaving(false);
      return;
    }

    const created = await res.json();
    setRegulations((prev) => [...prev, created].sort((a, b) => a.code.localeCompare(b.code)));
    setShowCreate(false);
    setForm(EMPTY_FORM);
    setSaving(false);
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC" }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: "white",
          borderBottom:    "1px solid #E2E8F0",
          padding:         "16px 24px",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "space-between",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1E293B", fontFamily: FONT }}>
            Regulations
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748B", fontFamily: FONT }}>
            {regulations.length} regulation{regulations.length !== 1 ? "s" : ""} in database
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding:         "8px 16px",
            backgroundColor: "#2563EB",
            color:           "white",
            border:          "none",
            borderRadius:    8,
            fontSize:        13,
            fontWeight:      600,
            fontFamily:      FONT,
            cursor:          "pointer",
          }}
        >
          + Create New Regulation
        </button>
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div
          style={{
            position:        "fixed",
            inset:           0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            zIndex:          100,
            padding:         16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius:    16,
              padding:         24,
              width:           "100%",
              maxWidth:        480,
              maxHeight:       "90vh",
              overflowY:       "auto",
            }}
          >
            <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#1E293B", fontFamily: FONT }}>
              Create New Regulation
            </h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <FormField label="Code" required value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} placeholder="EU 1169/2011" />
              <FormField label="Title" required value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="Food Information to Consumers" />
              <FormField label="Summary" value={form.summary} onChange={(v) => setForm((f) => ({ ...f, summary: v }))} placeholder="Plain-language summary..." multiline />
              <FormField label="Applies to (comma-separated)" value={form.applies_to} onChange={(v) => setForm((f) => ({ ...f, applies_to: v }))} placeholder="all" />
              <FormField label="Markets (comma-separated)" value={form.markets} onChange={(v) => setForm((f) => ({ ...f, markets: v }))} placeholder="EU" />
              <FormField label="EUR-Lex URL" value={form.official_url} onChange={(v) => setForm((f) => ({ ...f, official_url: v }))} placeholder="https://eur-lex.europa.eu/..." />
              <FormField label="Status" value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))} placeholder="active" />

              {error && (
                <p style={{ margin: 0, fontSize: 13, color: "#DC2626", fontFamily: FONT }}>{error}</p>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setError(null); }}
                  style={{
                    padding: "8px 16px", backgroundColor: "#F8FAFC", color: "#475569",
                    border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    fontFamily: FONT, cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "8px 16px", backgroundColor: saving ? "#93C5FD" : "#2563EB",
                    color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    fontFamily: FONT, cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ padding: 24 }}>
        <div style={{ backgroundColor: "white", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E2E8F0", backgroundColor: "#F8FAFC" }}>
                <Th>Code</Th>
                <Th>Title</Th>
                <Th>Status</Th>
                <Th>Last Updated</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {regulations.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
                    No regulations found. Create your first regulation above.
                  </td>
                </tr>
              )}
              {regulations.map((reg) => (
                <tr key={reg.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#2563EB" }}>
                    {reg.code}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#1E293B" }}>
                    {reg.title}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <StatusBadge status={reg.status} />
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#64748B" }}>
                    {reg.last_updated ? new Date(reg.last_updated).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <button
                      onClick={() => router.push(`/admin/regulations/${reg.id}`)}
                      style={{
                        padding: "4px 12px", backgroundColor: "#EFF6FF", color: "#2563EB",
                        border: "1px solid #BFDBFE", borderRadius: 6, fontSize: 12,
                        fontWeight: 600, fontFamily: FONT, cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th
      style={{
        padding:    "10px 16px",
        textAlign:  align ?? "left",
        fontSize:   11,
        fontWeight: 700,
        color:      "#64748B",
        fontFamily: "var(--font-body), DM Sans, sans-serif",
        textTransform: "uppercase",
        letterSpacing:  "0.06em",
      }}
    >
      {children}
    </th>
  );
}

function FormField({
  label, value, onChange, placeholder, required, multiline,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; multiline?: boolean;
}) {
  const shared = {
    width:           "100%",
    padding:         "8px 12px",
    border:          "1px solid #E2E8F0",
    borderRadius:    8,
    fontSize:        13,
    color:           "#1E293B",
    fontFamily:      "var(--font-body), DM Sans, sans-serif",
    outline:         "none",
  } as const;

  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", fontFamily: "var(--font-body), DM Sans, sans-serif", marginBottom: 4 }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={3}
          style={{ ...shared, resize: "vertical" as const }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          style={shared}
        />
      )}
    </div>
  );
}

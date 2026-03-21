"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Regulation, RegulationVersion } from "@/types/database";

const FONT = "var(--font-body), DM Sans, sans-serif";

export default function EditRegulationClient({
  regulation,
  versions,
}: {
  regulation: Regulation;
  versions: RegulationVersion[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    code:             regulation.code,
    title:            regulation.title,
    summary:          regulation.summary ?? "",
    applies_to:       (regulation.applies_to ?? []).join(", "),
    markets:          (regulation.markets ?? []).join(", "),
    channels:         (regulation.channels ?? []).join(", "),
    certifications:   (regulation.certifications ?? []).join(", "),
    checklist_item_refs: (regulation.checklist_item_refs ?? []).join(", "),
    official_url:     regulation.official_url ?? "",
    effective_date:   regulation.effective_date ?? "",
    status:           regulation.status,
    change_description: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const res = await fetch(`/api/admin/regulations/${regulation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code:                form.code,
        title:               form.title,
        summary:             form.summary || null,
        applies_to:          splitCSV(form.applies_to),
        markets:             splitCSV(form.markets),
        channels:            splitCSV(form.channels),
        certifications:      splitCSV(form.certifications),
        checklist_item_refs: splitCSV(form.checklist_item_refs),
        official_url:        form.official_url || null,
        effective_date:      form.effective_date || null,
        status:              form.status,
        change_description:  form.change_description || "Regulation updated",
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to save");
      setSaving(false);
      return;
    }

    setSuccess(true);
    setSaving(false);
    setForm((f) => ({ ...f, change_description: "" }));
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC" }}>
      {/* Header */}
      <div style={{ backgroundColor: "white", borderBottom: "1px solid #E2E8F0", padding: "16px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => router.push("/admin/regulations")}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#64748B", padding: 0 }}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1E293B", fontFamily: FONT }}>
          Edit: {regulation.code}
        </h1>
        <span style={{ fontSize: 12, color: "#94A3B8", fontFamily: FONT }}>v{regulation.version}</span>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>
        {/* Edit form */}
        <div style={{ backgroundColor: "white", borderRadius: 12, border: "1px solid #E2E8F0", padding: 24, marginBottom: 24 }}>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Code" required value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} />
            <Field label="Title" required value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
            <Field label="Summary" value={form.summary} onChange={(v) => setForm((f) => ({ ...f, summary: v }))} multiline />
            <Field label="Applies to (comma-separated)" value={form.applies_to} onChange={(v) => setForm((f) => ({ ...f, applies_to: v }))} />
            <Field label="Markets (comma-separated)" value={form.markets} onChange={(v) => setForm((f) => ({ ...f, markets: v }))} />
            <Field label="Channels (comma-separated)" value={form.channels} onChange={(v) => setForm((f) => ({ ...f, channels: v }))} />
            <Field label="Certifications (comma-separated)" value={form.certifications} onChange={(v) => setForm((f) => ({ ...f, certifications: v }))} />
            <Field label="Checklist item refs (comma-separated)" value={form.checklist_item_refs} onChange={(v) => setForm((f) => ({ ...f, checklist_item_refs: v }))} />
            <Field label="EUR-Lex URL" value={form.official_url} onChange={(v) => setForm((f) => ({ ...f, official_url: v }))} />
            <Field label="Effective date" value={form.effective_date} onChange={(v) => setForm((f) => ({ ...f, effective_date: v }))} type="date" />
            <Field label="Status" value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))} />

            <hr style={{ border: "none", borderTop: "1px solid #E2E8F0", margin: "4px 0" }} />

            <Field
              label="Change description (for version history)"
              value={form.change_description}
              onChange={(v) => setForm((f) => ({ ...f, change_description: v }))}
              placeholder="Describe what changed..."
            />

            {error && <p style={{ margin: 0, fontSize: 13, color: "#DC2626", fontFamily: FONT }}>{error}</p>}
            {success && <p style={{ margin: 0, fontSize: 13, color: "#16A34A", fontFamily: FONT }}>Saved successfully.</p>}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "8px 20px", backgroundColor: saving ? "#93C5FD" : "#2563EB",
                  color: "white", border: "none", borderRadius: 8, fontSize: 13,
                  fontWeight: 600, fontFamily: FONT, cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>

        {/* Version history */}
        <div style={{ backgroundColor: "white", borderRadius: 12, border: "1px solid #E2E8F0", padding: 24 }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1E293B", fontFamily: FONT }}>
            Version History
          </h2>
          {versions.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "#94A3B8", fontFamily: FONT }}>
              No version history yet. Changes will appear here after the first edit.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {versions.map((v) => (
                <div
                  key={v.id}
                  style={{
                    padding:      "12px 14px",
                    borderRadius: 8,
                    backgroundColor: "#F8FAFC",
                    border:       "1px solid #F1F5F9",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", fontFamily: FONT }}>
                      Version {v.version}
                    </span>
                    <span style={{ fontSize: 11, color: "#94A3B8", fontFamily: FONT }}>
                      {new Date(v.changed_at).toLocaleDateString()} by {v.changed_by ?? "—"}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: "#64748B", fontFamily: FONT }}>
                    {v.change_description ?? "No description"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function splitCSV(s: string): string[] {
  return s.split(",").map((v) => v.trim()).filter(Boolean);
}

function Field({
  label, value, onChange, placeholder, required, multiline, type,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; multiline?: boolean; type?: string;
}) {
  const shared = {
    width:        "100%",
    padding:      "8px 12px",
    border:       "1px solid #E2E8F0",
    borderRadius: 8,
    fontSize:     13,
    color:        "#1E293B",
    fontFamily:   "var(--font-body), DM Sans, sans-serif",
    outline:      "none",
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
          type={type ?? "text"}
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

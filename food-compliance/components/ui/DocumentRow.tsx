"use client";

import { FileText, TestTube2, Award, FileCheck, File, Download, Trash2 } from "lucide-react";
import type { DocumentType } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentWithUrl {
  id:           string;
  name:         string;
  type:         DocumentType;
  mime_type:    string;
  size_bytes:   number;
  expiry_date:  string | null;
  created_at:   string;
  signed_url:   string | null;
}

interface DocumentRowProps {
  doc:          DocumentWithUrl;
  onDelete:     (id: string) => void;
  deleting:     boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<DocumentType, {
  label: string;
  bg:    string;
  text:  string;
  Icon:  React.ComponentType<{ size?: number | string; color?: string; [key: string]: unknown }>;
}> = {
  spec_sheet:  { label: "Spec Sheet",   bg: "#EFF6FF", text: "#2563EB", Icon: FileText    },
  lab_report:  { label: "Lab Report",   bg: "#FFF7ED", text: "#D97706", Icon: TestTube2   },
  certificate: { label: "Certificate",  bg: "#F0FDF4", text: "#16A34A", Icon: Award       },
  declaration:  { label: "Declaration",    bg: "#F5F3FF", text: "#7C3AED", Icon: FileCheck   },
  label_artwork:{ label: "Label Artwork",  bg: "#FFF1F2", text: "#E11D48", Icon: File        },
  other:        { label: "Document",       bg: "#F1F5F9", text: "#475569", Icon: File        },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/**
 * Returns expiry status for display.
 * null        → no expiry set
 * "ok"        → > 30 days away
 * "warning"   → ≤ 30 days away
 * "expired"   → in the past
 */
function expiryStatus(dateStr: string | null): "ok" | "warning" | "expired" | null {
  if (!dateStr) return null;
  const expiry  = new Date(dateStr);
  const now     = new Date();
  const diffMs  = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0)  return "expired";
  if (diffDays <= 30) return "warning";
  return "ok";
}

const EXPIRY_STYLES = {
  ok:      { color: "#94A3B8" },
  warning: { color: "#D97706" },
  expired: { color: "#DC2626", fontWeight: 600 },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DocumentRow({ doc, onDelete, deleting }: DocumentRowProps) {
  const cfg    = TYPE_CONFIG[doc.type];
  const status = expiryStatus(doc.expiry_date);

  return (
    <div
      style={{
        backgroundColor: "white",
        borderBottom:    "1px solid #E2E8F0",
        padding:         "12px 16px",
        display:         "flex",
        alignItems:      "flex-start",
        gap:             12,
        opacity:         deleting ? 0.5 : 1,
        transition:      "opacity 0.15s",
      }}
    >
      {/* Type icon */}
      <div
        style={{
          flexShrink:     0,
          width:          36,
          height:         36,
          borderRadius:   8,
          backgroundColor: cfg.bg,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
        }}
      >
        <cfg.Icon size={18} color={cfg.text} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name */}
        <p
          style={{
            margin:       "0 0 4px",
            fontSize:     14,
            fontWeight:   600,
            color:        "#1E293B",
            fontFamily:   "var(--font-body), DM Sans, sans-serif",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
          }}
        >
          {doc.name}
        </p>

        {/* Meta row: type badge + size */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize:        10,
              fontWeight:      700,
              textTransform:   "uppercase",
              letterSpacing:   "0.06em",
              color:           cfg.text,
              backgroundColor: cfg.bg,
              padding:         "2px 6px",
              borderRadius:    20,
              fontFamily:      "var(--font-body), DM Sans, sans-serif",
              whiteSpace:      "nowrap",
            }}
          >
            {cfg.label}
          </span>

          <span
            style={{
              fontSize:   12,
              color:      "#94A3B8",
              fontFamily: "var(--font-body), DM Sans, sans-serif",
            }}
          >
            {formatBytes(doc.size_bytes)}
          </span>

          <span
            style={{
              fontSize:   12,
              color:      "#94A3B8",
              fontFamily: "var(--font-body), DM Sans, sans-serif",
            }}
          >
            {formatDate(doc.created_at)}
          </span>
        </div>

        {/* Expiry row */}
        {status && doc.expiry_date && (
          <p
            style={{
              margin:     "4px 0 0",
              fontSize:   11,
              fontFamily: "var(--font-body), DM Sans, sans-serif",
              ...EXPIRY_STYLES[status],
            }}
          >
            {status === "expired"
              ? `Expired ${formatDate(doc.expiry_date)}`
              : `Expires ${formatDate(doc.expiry_date)}`}
            {status === "warning" && " — renew soon"}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
        {/* Download */}
        {doc.signed_url && (
          <a
            href={doc.signed_url}
            download={doc.name}
            aria-label="Download"
            style={{
              width:          36,
              height:         36,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              borderRadius:   8,
              color:          "#64748B",
              textDecoration: "none",
            }}
          >
            <Download size={16} />
          </a>
        )}

        {/* Delete */}
        <button
          onClick={() => !deleting && onDelete(doc.id)}
          disabled={deleting}
          aria-label="Delete document"
          style={{
            width:          36,
            height:         36,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            borderRadius:   8,
            background:     "none",
            border:         "none",
            color:          "#DC2626",
            cursor:         deleting ? "not-allowed" : "pointer",
            padding:        0,
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import ScoreGauge from "@/components/ui/ScoreGauge";
import StatusBadge from "@/components/ui/StatusBadge";
import CategoryBar from "@/components/ui/CategoryBar";
import ComplianceAnchor from "@/components/ui/ComplianceAnchor";
import DocumentRow from "@/components/ui/DocumentRow";
import type { DocumentWithUrl } from "@/components/ui/DocumentRow";
import TemplatePreviewSheet from "@/components/ui/TemplatePreviewSheet";
import type { TemplateType } from "@/components/ui/TemplatePreviewSheet";
import { ChevronDown, ChevronLeft, CheckCircle2, Upload, FileText } from "lucide-react";
import type {
  Product,
  ChecklistItem,
  AuditLog,
  ChecklistCategory,
  ScoreResult,
  DocumentType,
  Packaging,
  Review,
} from "@/types/database";
import type { IngredientWithSupplier } from "@/app/api/ingredients/route";
import SupplyChainHealth, { computeHealth } from "@/components/ui/SupplyChainHealth";
import { calculateScore } from "@/lib/score/calculateScore";
import PackagingTab from "./PackagingTab";
import ChangeAlert from "@/components/ui/ChangeAlert";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductRecordProps {
  product:            Product;
  initialItems:       ChecklistItem[];
  auditLog:           AuditLog[];
  initialScore:       ScoreResult;
  initialDocuments:   DocumentWithUrl[];
  supplyIngredients?: IngredientWithSupplier[];
  initialPackaging?:  Packaging | null;
  labelArtworkDocs?:  DocumentWithUrl[];
  activeReview?:      Review | null;
}

type Tab = "overview" | "documents" | "supply" | "packaging" | "audit";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { key: ChecklistCategory; label: string; color: string }[] = [
  { key: "formula",    label: "Formula",     color: "#2563EB" },
  { key: "compliance", label: "Compliance",  color: "#DC2626" },
  { key: "documents",  label: "Documents",   color: "#D97706" },
  { key: "packaging",  label: "Packaging",   color: "#7C3AED" },
  { key: "suppliers",  label: "Suppliers",   color: "#16A34A" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sortItems(items: ChecklistItem[]): ChecklistItem[] {
  return [...items].sort((a, b) => {
    // Completed last
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    // Blocking first within incomplete
    if (!a.completed && a.blocking !== b.blocking) return a.blocking ? -1 : 1;
    // Higher weight first within same group
    return b.weight - a.weight;
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── ChecklistRow ─────────────────────────────────────────────────────────────

function ChecklistRow({
  item,
  onToggle,
  loading,
}: {
  item:     ChecklistItem;
  onToggle: (item: ChecklistItem) => void;
  loading:  boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasRegulation =
    item.regulation_code &&
    item.regulation_article &&
    item.regulation_explanation &&
    item.regulation_url;

  return (
    <div style={{ backgroundColor: "white", borderBottom: "1px solid #E2E8F0" }}>
      {/* Main row */}
      <div
        style={{
          display:       "flex",
          alignItems:    "flex-start",
          gap:           12,
          paddingLeft:   16,
          paddingRight:  8,
          paddingTop:    12,
          paddingBottom: 12,
          minHeight:     44,
          opacity:       loading ? 0.6 : 1,
          transition:    "opacity 0.15s",
        }}
      >
        {/* Checkbox */}
        <button
          onClick={() => !loading && onToggle(item)}
          aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
          disabled={loading}
          style={{
            flexShrink:     0,
            width:          22,
            height:         22,
            marginTop:      2,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            background:     "none",
            border:         "none",
            padding:        0,
            cursor:         loading ? "not-allowed" : "pointer",
          }}
        >
          {item.completed ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="11" fill="#16A34A" />
              <path d="M6.5 11.5L9.5 14.5L15.5 8.5" stroke="white" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="10" stroke="#CBD5E1" strokeWidth="1.5" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 2 }}>
            <span
              style={{
                fontSize:       14,
                fontWeight:     600,
                color:          item.completed ? "#94A3B8" : "#1E293B",
                textDecoration: item.completed ? "line-through" : "none",
                fontFamily:     "var(--font-body), DM Sans, sans-serif",
                lineHeight:     1.4,
              }}
            >
              {item.title}
            </span>

            {item.blocking && !item.completed && (
              <span
                style={{
                  fontSize:        10,
                  fontWeight:      700,
                  textTransform:   "uppercase",
                  letterSpacing:   "0.06em",
                  color:           "#DC2626",
                  backgroundColor: "#FEF2F2",
                  padding:         "2px 6px",
                  borderRadius:    20,
                  fontFamily:      "var(--font-body), DM Sans, sans-serif",
                  whiteSpace:      "nowrap",
                }}
              >
                Required
              </span>
            )}
          </div>

          {hasRegulation && !item.completed && (
            <div style={{ marginTop: 4 }}>
              <ComplianceAnchor
                code={item.regulation_code!}
                article={item.regulation_article!}
                explanation={item.regulation_explanation!}
                url={item.regulation_url!}
              />
            </div>
          )}

          {item.completed && item.completed_at && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
              <CheckCircle2 size={12} color="#16A34A" />
              <span
                style={{
                  fontSize:   11,
                  color:      "#16A34A",
                  fontFamily: "var(--font-body), DM Sans, sans-serif",
                }}
              >
                {formatDate(item.completed_at)}
                {item.completed_by ? ` · ${item.completed_by}` : ""}
              </span>
            </div>
          )}
        </div>

        {/* Expand chevron for help text */}
        {item.help_text && (
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse" : "Expand"}
            style={{
              flexShrink:     0,
              minWidth:       44,
              minHeight:      44,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              background:     "none",
              border:         "none",
              padding:        0,
              cursor:         "pointer",
              color:          "#94A3B8",
              transform:      expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition:     "transform 0.2s ease",
            }}
          >
            <ChevronDown size={16} />
          </button>
        )}
      </div>

      {/* Help text panel */}
      {item.help_text && (
        <div
          style={{
            overflow:   "hidden",
            maxHeight:  expanded ? 200 : 0,
            transition: "max-height 0.25s ease",
          }}
        >
          <p
            style={{
              paddingLeft:   50,
              paddingRight:  16,
              paddingBottom: 12,
              paddingTop:    0,
              fontSize:      13,
              color:         "#475569",
              lineHeight:    1.55,
              fontFamily:    "var(--font-body), DM Sans, sans-serif",
              margin:        0,
            }}
          >
            {item.help_text}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── CategorySection ──────────────────────────────────────────────────────────

function CategorySection({
  label,
  color,
  percentage,
  items,
  onToggle,
  loadingId,
}: {
  label:      string;
  color:      string;
  percentage: number;
  items:      ChecklistItem[];
  onToggle:   (item: ChecklistItem) => void;
  loadingId:  string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginBottom: 2 }}>
      {/* Header — tapping expands the section */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width:           "100%",
          background:      "none",
          border:          "none",
          padding:         "12px 16px",
          cursor:          "pointer",
          backgroundColor: "white",
          borderBottom:    open ? "none" : "1px solid #E2E8F0",
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <CategoryBar label={label} percentage={percentage} color={color} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ChevronDown
            size={14}
            color="#94A3B8"
            style={{
              transform:  open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </div>
      </button>

      {/* Checklist items */}
      {open && (
        <div>
          {items.length === 0 ? (
            <p
              style={{
                padding:    "12px 16px",
                fontSize:   13,
                color:      "#94A3B8",
                fontFamily: "var(--font-body), DM Sans, sans-serif",
                margin:     0,
              }}
            >
              No items in this category.
            </p>
          ) : (
            sortItems(items).map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                onToggle={onToggle}
                loading={loadingId === item.id}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "overview",  label: "Overview" },
    { key: "documents", label: "Documents" },
    { key: "supply",    label: "Supply Chain" },
    { key: "packaging", label: "Packaging" },
    { key: "audit",     label: "Audit Log" },
  ];

  return (
    <div
      style={{
        display:         "flex",
        borderBottom:    "1px solid #E2E8F0",
        backgroundColor: "white",
        overflowX:       "auto",
        scrollbarWidth:  "none",
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            flexShrink:    0,
            padding:       "12px 16px",
            fontSize:      13,
            fontWeight:    active === tab.key ? 700 : 500,
            color:         active === tab.key ? "#2563EB" : "#64748B",
            background:    "none",
            border:        "none",
            borderBottom:  active === tab.key ? "2px solid #2563EB" : "2px solid transparent",
            cursor:        "pointer",
            fontFamily:    "var(--font-body), DM Sans, sans-serif",
            whiteSpace:    "nowrap",
            marginBottom:  -1,
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Template button config ───────────────────────────────────────────────────

const TEMPLATE_BUTTONS: {
  type:        TemplateType;
  name:        string;
  description: string;
  iconBg:      string;
  iconColor:   string;
}[] = [
  {
    type:        "allergen_statement",
    name:        "Allergen Statement",
    description: "EU 14 allergens · contains / may contain",
    iconBg:      "#FEE2E2",
    iconColor:   "#DC2626",
  },
  {
    type:        "nutritional_declaration",
    name:        "Nutritional Declaration",
    description: "EU 1169/2011 Annex XV mandatory table",
    iconBg:      "#FEF3C7",
    iconColor:   "#D97706",
  },
  {
    type:        "product_spec",
    name:        "Product Specification",
    description: "Formula, ingredients & nutrition overview",
    iconBg:      "#DBEAFE",
    iconColor:   "#2563EB",
  },
  {
    type:        "traceability_report",
    name:        "Traceability Report",
    description: "Ingredient → supplier mapping",
    iconBg:      "#DCFCE7",
    iconColor:   "#16A34A",
  },
  {
    type:        "haccp_summary",
    name:        "HACCP Summary",
    description: "Structured HACCP plan template",
    iconBg:      "#F3E8FF",
    iconColor:   "#7C3AED",
  },
];

// ─── Doc type options ─────────────────────────────────────────────────────────

const DOC_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "spec_sheet",  label: "Spec Sheet"  },
  { value: "lab_report",  label: "Lab Report"  },
  { value: "certificate", label: "Certificate" },
  { value: "declaration", label: "Declaration" },
  { value: "other",       label: "Other"        },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProductRecord({
  product,
  initialItems,
  auditLog,
  initialScore,
  initialDocuments,
  supplyIngredients  = [],
  initialPackaging   = null,
  labelArtworkDocs   = [],
  activeReview       = null,
}: ProductRecordProps) {
  const router    = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [tab, setTab]                         = useState<Tab>("overview");
  const [items, setItems]                     = useState<ChecklistItem[]>(initialItems);
  const [score, setScore]                     = useState<ScoreResult>(initialScore);
  const [loadingId, setLoadingId]             = useState<string | null>(null);
  const [cascadeNotifications, setCascadeNotifications] = useState<string[]>([]);

  // Documents state
  const [documents, setDocuments]         = useState<DocumentWithUrl[]>(initialDocuments);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [uploading, setUploading]         = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadType, setUploadType]       = useState<DocumentType>("spec_sheet");
  const [uploadExpiry, setUploadExpiry]   = useState("");

  // Template preview state
  const [activeTemplate, setActiveTemplate] = useState<{ type: TemplateType; name: string } | null>(null);
  const [autoSpecBanner, setAutoSpecBanner] = useState(false);
  const autoSpecFired = useRef(false);

  // Optimistic toggle — update local state immediately, then call API
  const handleToggle = useCallback(async (item: ChecklistItem) => {
    const newCompleted = !item.completed;

    // Optimistic update
    const optimisticItems = items.map((i) =>
      i.id === item.id
        ? {
            ...i,
            completed:    newCompleted,
            completed_at: newCompleted ? new Date().toISOString() : null,
            completed_by: newCompleted ? "you" : null,
          }
        : i,
    );
    setItems(optimisticItems);
    setScore(calculateScore(optimisticItems));
    setLoadingId(item.id);

    try {
      const res = await fetch(
        `/api/products/${product.id}/checklist/${item.id}`,
        {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ completed: newCompleted }),
        },
      );

      if (!res.ok) throw new Error("Request failed");

      const { item: serverItem, score: serverScore } = await res.json();

      // Reconcile with server truth
      setItems((prev) =>
        prev.map((i) => (i.id === serverItem.id ? serverItem : i)),
      );
      setScore(serverScore);
    } catch {
      // Revert on error
      setItems(items);
      setScore(initialScore);
    } finally {
      setLoadingId(null);
    }
  }, [items, product.id, initialScore]);

  // ─── Document handlers ──────────────────────────────────────────────────────

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.append("file",  file);
    form.append("type",  uploadType);
    if (uploadExpiry) form.append("expiry_date", uploadExpiry);

    try {
      const res = await fetch(`/api/products/${product.id}/documents`, {
        method: "POST",
        body:   form,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { document: newDoc, cascade } = await res.json();
      setDocuments((prev) => [newDoc, ...prev]);
      setShowUploadForm(false);
      setUploadExpiry("");
      if (cascade?.notifications?.length) {
        setCascadeNotifications((prev) => [...prev, ...cascade.notifications]);
      }
    } catch {
      // Leave form open so the user can retry
    } finally {
      setUploading(false);
    }
  }, [product.id, uploadType, uploadExpiry]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // Reset input so the same file can be re-selected after a failed upload
    e.target.value = "";
  }, [handleUpload]);

  const handleDeleteDocument = useCallback(async (docId: string) => {
    setDeletingDocId(docId);
    try {
      const res = await fetch(`/api/products/${product.id}/documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      // Keep the item in the list; user can retry
    } finally {
      setDeletingDocId(null);
    }
  }, [product.id]);

  // ─── Auto-generate product spec when all formula items are complete ──────────

  useEffect(() => {
    if (autoSpecFired.current) return;

    const formulaItems = items.filter((i) => i.category === "formula");
    if (formulaItems.length === 0) return;

    const allDone = formulaItems.every((i) => i.completed);
    if (!allDone) return;

    const alreadyExists = documents.some((d) =>
      d.name.toLowerCase().includes("product specification"),
    );
    if (alreadyExists) return;

    autoSpecFired.current = true;

    // Fire-and-forget: generate + save the product spec silently
    (async () => {
      try {
        const genRes = await fetch(`/api/products/${product.id}/templates/product_spec`);
        if (!genRes.ok) return;
        const { html } = await genRes.json();

        const saveRes = await fetch(`/api/products/${product.id}/templates/product_spec`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ html }),
        });
        if (!saveRes.ok) return;

        const { document: newDoc } = await saveRes.json();
        setDocuments((prev) => [newDoc, ...prev]);
        setAutoSpecBanner(true);
      } catch {
        // Silent failure — non-blocking background operation
      }
    })();
  }, [items, documents, product.id]);

  // ─── Next action button logic ────────────────────────────────────────────────

  // Next action button logic
  const nextBlockingItem = items
    .filter((i) => i.blocking && !i.completed)
    .sort((a, b) => b.weight - a.weight)[0];

  const nextActionLabel = nextBlockingItem
    ? `Start: ${nextBlockingItem.title}`
    : score.total >= 75
      ? "Start review"
      : "Continue your checklist";

  // Navigate to review page when button says "Start review"
  const handleNextAction = () => {
    if (!nextBlockingItem && score.total >= 75) {
      router.push(`/products/${product.id}/review`);
    }
  };

  return (
    <div style={{ backgroundColor: "#F8FAFC", minHeight: "100%" }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: "white",
          borderBottom:    "1px solid #E2E8F0",
          padding:         "12px 16px 0",
        }}
      >
        {/* Back + name row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            style={{
              background: "none",
              border:     "none",
              padding:    0,
              cursor:     "pointer",
              color:      "#64748B",
              display:    "flex",
              alignItems: "center",
            }}
          >
            <ChevronLeft size={20} />
          </button>

          <h1
            style={{
              flex:       1,
              fontSize:   18,
              fontWeight: 700,
              color:      "#1E293B",
              fontFamily: "var(--font-body), DM Sans, sans-serif",
              margin:     0,
              overflow:   "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {product.name}
          </h1>

          <StatusBadge status={product.status} />
        </div>

        <TabBar active={tab} onChange={setTab} />
      </div>

      {/* ── Change alert banner ──────────────────────────────────────── */}
      {cascadeNotifications.length > 0 && (
        <ChangeAlert
          notifications={cascadeNotifications}
          onDismiss={() => setCascadeNotifications([])}
        />
      )}

      {/* ── Overview tab ────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div>
          {/* Score section */}
          <div
            style={{
              backgroundColor: "white",
              padding:         "24px 16px 20px",
              display:         "flex",
              flexDirection:   "column",
              alignItems:      "center",
              gap:             12,
              borderBottom:    "1px solid #E2E8F0",
            }}
          >
            <ScoreGauge score={score.total} size="lg" />

            <p
              style={{
                fontSize:   13,
                color:      "#475569",
                fontFamily: "var(--font-body), DM Sans, sans-serif",
                textAlign:  "center",
                margin:     0,
                maxWidth:   260,
                lineHeight: 1.5,
              }}
            >
              {score.milestoneMessage}
            </p>

            {/* Blocking items warning */}
            {score.blockingIncomplete.length > 0 && (
              <div
                style={{
                  backgroundColor: "#FEF2F2",
                  borderRadius:    8,
                  padding:         "8px 12px",
                  width:           "100%",
                }}
              >
                <p
                  style={{
                    fontSize:   11,
                    fontWeight: 700,
                    color:      "#DC2626",
                    fontFamily: "var(--font-body), DM Sans, sans-serif",
                    margin:     "0 0 4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {score.blockingIncomplete.length} required item
                  {score.blockingIncomplete.length !== 1 ? "s" : ""} outstanding
                </p>
                {score.blockingIncomplete.slice(0, 3).map((title) => (
                  <p
                    key={title}
                    style={{
                      fontSize:   12,
                      color:      "#DC2626",
                      fontFamily: "var(--font-body), DM Sans, sans-serif",
                      margin:     "2px 0 0",
                    }}
                  >
                    · {title}
                  </p>
                ))}
                {score.blockingIncomplete.length > 3 && (
                  <p style={{ fontSize: 12, color: "#DC2626", fontFamily: "var(--font-body), DM Sans, sans-serif", margin: "2px 0 0" }}>
                    · and {score.blockingIncomplete.length - 3} more
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Next action button */}
          <div style={{ padding: "16px 16px 8px" }}>
            <button
              onClick={handleNextAction}
              style={{
                width:           "100%",
                height:          52,
                backgroundColor: "#2563EB",
                color:           "white",
                border:          "none",
                borderRadius:    12,
                fontSize:        15,
                fontWeight:      800,
                fontFamily:      "var(--font-display), Outfit, sans-serif",
                cursor:          "pointer",
                padding:         "0 16px",
                overflow:        "hidden",
                textOverflow:    "ellipsis",
                whiteSpace:      "nowrap",
              }}
            >
              {nextActionLabel}
            </button>
          </div>

          {/* Review card — shown when score >= 75 and no active review */}
          {score.total >= 75 && !activeReview && (
            <div style={{ padding: "0 16px 8px" }}>
              <div
                style={{
                  backgroundColor: "#EFF6FF",
                  border:          "1.5px solid #BFDBFE",
                  borderRadius:    14,
                  padding:         "20px 16px",
                  display:         "flex",
                  flexDirection:   "column",
                  gap:             10,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize:   17,
                      fontWeight: 700,
                      color:      "#1D4ED8",
                      fontFamily: "var(--font-display), Outfit, sans-serif",
                      margin:     "0 0 4px",
                    }}
                  >
                    Your product is nearly ready.
                  </p>
                  <p
                    style={{
                      fontSize:   13,
                      color:      "#3B82F6",
                      fontFamily: "var(--font-body), DM Sans, sans-serif",
                      margin:     0,
                      lineHeight: 1.5,
                    }}
                  >
                    Let us check everything together. This takes about 5 minutes.
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/products/${product.id}/review`)}
                  style={{
                    width:           "100%",
                    height:          48,
                    backgroundColor: "#2563EB",
                    color:           "white",
                    border:          "none",
                    borderRadius:    10,
                    fontSize:        15,
                    fontWeight:      800,
                    fontFamily:      "var(--font-display), Outfit, sans-serif",
                    cursor:          "pointer",
                  }}
                >
                  Start Review
                </button>
              </div>
            </div>
          )}

          {/* Resume Review banner — shown when a review is in_progress */}
          {activeReview && (
            <div style={{ padding: "0 16px 8px" }}>
              <div
                style={{
                  backgroundColor: "#FFFBEB",
                  border:          "1.5px solid #FDE68A",
                  borderRadius:    12,
                  padding:         "12px 14px",
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "space-between",
                  gap:             12,
                }}
              >
                <p
                  style={{
                    fontSize:   13,
                    fontWeight: 600,
                    color:      "#92400E",
                    fontFamily: "var(--font-body), DM Sans, sans-serif",
                    margin:     0,
                    flex:       1,
                  }}
                >
                  Review in progress — step {(activeReview.current_step ?? 0) + 1} of {activeReview.total_steps ?? "?"}
                </p>
                <button
                  onClick={() => router.push(`/products/${product.id}/review`)}
                  style={{
                    flexShrink:      0,
                    height:          36,
                    padding:         "0 14px",
                    backgroundColor: "#F59E0B",
                    color:           "white",
                    border:          "none",
                    borderRadius:    8,
                    fontSize:        13,
                    fontWeight:      700,
                    fontFamily:      "var(--font-body), DM Sans, sans-serif",
                    cursor:          "pointer",
                    whiteSpace:      "nowrap",
                  }}
                >
                  Resume Review →
                </button>
              </div>
            </div>
          )}

          {/* Packaging summary card — shown when primary material is set */}
          {initialPackaging?.primary_material && (
            <div style={{ padding: "0 16px 4px" }}>
              <button
                onClick={() => setTab("packaging")}
                style={{
                  width:           "100%",
                  background:      "none",
                  border:          "1px solid #E2E8F0",
                  borderRadius:    12,
                  padding:         "12px 14px",
                  cursor:          "pointer",
                  textAlign:       "left",
                  backgroundColor: "white",
                }}
              >
                {/* Row 1: material + recyclability chip */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 16 }}>📦</span>
                  <p style={{ flex: 1, margin: 0, fontSize: 13, fontWeight: 600, color: "#1E293B", fontFamily: "var(--font-body), DM Sans, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {initialPackaging.primary_material}
                  </p>
                  {initialPackaging.recyclability_code && (
                    <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20, backgroundColor: "#DBEAFE", color: "#1D4ED8", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>
                      {initialPackaging.recyclability_code}
                    </span>
                  )}
                </div>

                {/* Row 2: PPWR badge + barcode */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {initialPackaging.ppwr_compliant === true  && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20, backgroundColor: "#F0FDF4", color: "#16A34A", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>PPWR ✓</span>}
                  {initialPackaging.ppwr_compliant === false && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20, backgroundColor: "#FEF2F2", color: "#DC2626", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>PPWR ✗</span>}
                  {initialPackaging.ppwr_compliant === null  && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20, backgroundColor: "#F8FAFC", color: "#64748B", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>PPWR ?</span>}
                  {initialPackaging.barcode && (
                    <span style={{ fontSize: 11, color: "#64748B", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>
                      {initialPackaging.barcode_type}: {initialPackaging.barcode}
                    </span>
                  )}
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "#2563EB", fontFamily: "var(--font-body), DM Sans, sans-serif", fontWeight: 600 }}>
                    Edit →
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* Category progress bars */}
          <div style={{ padding: "8px 0 16px" }}>
            {CATEGORIES.map((cat) => {
              const catItems = items.filter((i) => i.category === cat.key);
              const catBreakdown = score.breakdown[cat.key];
              return (
                <CategorySection
                  key={cat.key}
                  label={cat.label}
                  color={cat.color}
                  percentage={catBreakdown.percentage}
                  items={catItems}
                  onToggle={handleToggle}
                  loadingId={loadingId}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Documents tab ───────────────────────────────────────────── */}
      {tab === "documents" && (
        <div>
          {/* Hidden file input — triggered programmatically */}
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv,.txt"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          {/* Auto-spec banner */}
          {autoSpecBanner && (
            <div
              style={{
                backgroundColor: "#FFFBEB",
                borderBottom:    "1px solid #FCD34D",
                padding:         "10px 16px",
                display:         "flex",
                alignItems:      "center",
                gap:             10,
              }}
            >
              <p
                style={{
                  flex:       1,
                  margin:     0,
                  fontSize:   13,
                  color:      "#92400E",
                  fontFamily: "var(--font-body), DM Sans, sans-serif",
                  fontWeight: 500,
                }}
              >
                Your product spec has been pre-filled and saved to Documents.
              </p>
              <button
                onClick={() => setAutoSpecBanner(false)}
                style={{
                  background: "none",
                  border:     "none",
                  padding:    0,
                  cursor:     "pointer",
                  color:      "#92400E",
                  fontSize:   18,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          {/* Generate templates section */}
          <div
            style={{
              backgroundColor: "white",
              borderBottom:    "1px solid #E2E8F0",
              padding:         "16px 16px 20px",
            }}
          >
            <p
              style={{
                margin:        "0 0 12px",
                fontSize:      11,
                fontWeight:    700,
                color:         "#64748B",
                fontFamily:    "var(--font-body), DM Sans, sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Generate Templates
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TEMPLATE_BUTTONS.map((tpl) => (
                <button
                  key={tpl.type}
                  onClick={() => setActiveTemplate({ type: tpl.type, name: tpl.name })}
                  style={{
                    display:         "flex",
                    alignItems:      "center",
                    gap:             10,
                    width:           "100%",
                    padding:         "10px 12px",
                    borderRadius:    8,
                    border:          "1px solid #E2E8F0",
                    backgroundColor: "#F8FAFC",
                    cursor:          "pointer",
                    textAlign:       "left",
                  }}
                >
                  <div
                    style={{
                      width:           28,
                      height:          28,
                      borderRadius:    6,
                      backgroundColor: tpl.iconBg,
                      display:         "flex",
                      alignItems:      "center",
                      justifyContent:  "center",
                      flexShrink:      0,
                    }}
                  >
                    <FileText size={14} color={tpl.iconColor} />
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <p
                      style={{
                        margin:       0,
                        fontSize:     13,
                        fontWeight:   600,
                        color:        "#1E293B",
                        fontFamily:   "var(--font-body), DM Sans, sans-serif",
                        overflow:     "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace:   "nowrap",
                      }}
                    >
                      {tpl.name}
                    </p>
                    <p
                      style={{
                        margin:       0,
                        fontSize:     11,
                        color:        "#94A3B8",
                        fontFamily:   "var(--font-body), DM Sans, sans-serif",
                        overflow:     "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace:   "nowrap",
                      }}
                    >
                      {tpl.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Upload form */}
          {showUploadForm && (
            <div
              style={{
                backgroundColor: "white",
                borderBottom:    "1px solid #E2E8F0",
                padding:         "16px 16px 20px",
              }}
            >
              <p
                style={{
                  margin:     "0 0 12px",
                  fontSize:   13,
                  fontWeight: 700,
                  color:      "#1E293B",
                  fontFamily: "var(--font-body), DM Sans, sans-serif",
                }}
              >
                Upload document
              </p>

              {/* Document type */}
              <label
                style={{
                  display:    "block",
                  fontSize:   11,
                  fontWeight: 600,
                  color:      "#64748B",
                  fontFamily: "var(--font-body), DM Sans, sans-serif",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Document type
              </label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as DocumentType)}
                style={{
                  width:        "100%",
                  height:       44,
                  borderRadius: 8,
                  border:       "1px solid #CBD5E1",
                  padding:      "0 12px",
                  fontSize:     14,
                  color:        "#1E293B",
                  fontFamily:   "var(--font-body), DM Sans, sans-serif",
                  background:   "white",
                  marginBottom: 12,
                  cursor:       "pointer",
                }}
              >
                {DOC_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* Expiry date — most useful for certificates */}
              {uploadType === "certificate" && (
                <>
                  <label
                    style={{
                      display:    "block",
                      fontSize:   11,
                      fontWeight: 600,
                      color:      "#64748B",
                      fontFamily: "var(--font-body), DM Sans, sans-serif",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Expiry date (optional)
                  </label>
                  <input
                    type="date"
                    value={uploadExpiry}
                    onChange={(e) => setUploadExpiry(e.target.value)}
                    style={{
                      width:        "100%",
                      height:       44,
                      borderRadius: 8,
                      border:       "1px solid #CBD5E1",
                      padding:      "0 12px",
                      fontSize:     14,
                      color:        "#1E293B",
                      fontFamily:   "var(--font-body), DM Sans, sans-serif",
                      background:   "white",
                      marginBottom: 12,
                      boxSizing:    "border-box",
                    }}
                  />
                </>
              )}

              {/* Buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    setShowUploadForm(false);
                    setUploadExpiry("");
                  }}
                  style={{
                    flex:         1,
                    height:       44,
                    borderRadius: 8,
                    border:       "1px solid #CBD5E1",
                    background:   "white",
                    fontSize:     14,
                    fontWeight:   600,
                    color:        "#64748B",
                    fontFamily:   "var(--font-body), DM Sans, sans-serif",
                    cursor:       "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                  style={{
                    flex:            2,
                    height:          44,
                    borderRadius:    8,
                    border:          "none",
                    backgroundColor: "#2563EB",
                    color:           "white",
                    fontSize:        14,
                    fontWeight:      700,
                    fontFamily:      "var(--font-body), DM Sans, sans-serif",
                    cursor:          uploading ? "not-allowed" : "pointer",
                    opacity:         uploading ? 0.7 : 1,
                  }}
                >
                  {uploading ? "Uploading…" : "Choose file"}
                </button>
              </div>
            </div>
          )}

          {/* Document list */}
          {documents.length === 0 && !showUploadForm ? (
            /* Empty state */
            <div
              style={{
                margin:          16,
                backgroundColor: "white",
                borderRadius:    12,
                padding:         "32px 24px",
                textAlign:       "center",
                border:          "2px dashed #E2E8F0",
              }}
            >
              <p style={{ fontSize: 28, margin: "0 0 8px" }}>📄</p>
              <p
                style={{
                  fontSize:   14,
                  fontWeight: 600,
                  color:      "#1E293B",
                  fontFamily: "var(--font-body), DM Sans, sans-serif",
                  margin:     "0 0 4px",
                }}
              >
                No documents yet
              </p>
              <p
                style={{
                  fontSize:   13,
                  color:      "#94A3B8",
                  fontFamily: "var(--font-body), DM Sans, sans-serif",
                  margin:     "0 0 16px",
                }}
              >
                Upload spec sheets, lab reports, and certificates.
              </p>
              <button
                onClick={() => setShowUploadForm(true)}
                style={{
                  height:          40,
                  paddingLeft:     16,
                  paddingRight:    16,
                  borderRadius:    8,
                  border:          "none",
                  backgroundColor: "#2563EB",
                  color:           "white",
                  fontSize:        13,
                  fontWeight:      700,
                  fontFamily:      "var(--font-body), DM Sans, sans-serif",
                  cursor:          "pointer",
                  display:         "inline-flex",
                  alignItems:      "center",
                  gap:             6,
                }}
              >
                <Upload size={14} />
                Upload document
              </button>
            </div>
          ) : (
            <div>
              {documents.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  onDelete={handleDeleteDocument}
                  deleting={deletingDocId === doc.id}
                />
              ))}
            </div>
          )}

          {/* Sticky upload button (shown when list is non-empty) */}
          {documents.length > 0 && (
            <div style={{ padding: "12px 16px" }}>
              <button
                onClick={() => setShowUploadForm((v) => !v)}
                style={{
                  width:           "100%",
                  height:          44,
                  borderRadius:    8,
                  border:          "1px dashed #93C5FD",
                  backgroundColor: "#EFF6FF",
                  color:           "#2563EB",
                  fontSize:        14,
                  fontWeight:      600,
                  fontFamily:      "var(--font-body), DM Sans, sans-serif",
                  cursor:          "pointer",
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  gap:             6,
                }}
              >
                <Upload size={14} />
                Upload document
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Supply Chain tab ────────────────────────────────────────── */}
      {tab === "supply" && (
        <div>
          {/* Health banner */}
          <SupplyChainHealth status={computeHealth(supplyIngredients)} />

          {supplyIngredients.length === 0 ? (
            <div style={{ margin: "0 16px 16px", backgroundColor: "white", borderRadius: 12, padding: "24px 20px", textAlign: "center", border: "1px solid #E2E8F0" }}>
              <p style={{ fontSize: 24, margin: "0 0 8px" }}>🌿</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#1E293B", fontFamily: "var(--font-body), DM Sans, sans-serif", margin: "0 0 4px" }}>
                No ingredients yet
              </p>
              <p style={{ fontSize: 13, color: "#94A3B8", fontFamily: "var(--font-body), DM Sans, sans-serif", margin: "0 0 16px" }}>
                Add ingredients to the active formula to track supplier compliance.
              </p>
            </div>
          ) : (
            <div>
              {/* Section header */}
              <p style={{ margin: "12px 16px 8px", fontSize: 11, fontWeight: 700, color: "#64748B", fontFamily: "var(--font-body), DM Sans, sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Ingredients ({supplyIngredients.length})
              </p>

              <div style={{ backgroundColor: "white", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
                {supplyIngredients.map((ing) => (
                  <div key={ing.id} style={{ padding: "10px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Supplier approval dot */}
                    <div style={{ flexShrink: 0, width: 8, height: 8, borderRadius: "50%", backgroundColor: !ing.supplier_id ? "#D97706" : ing.supplier_approved === false ? "#DC2626" : "#16A34A" }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "#1E293B", fontFamily: "var(--font-body), DM Sans, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ing.name}
                        <span style={{ fontWeight: 400, color: "#94A3B8", marginLeft: 6 }}>{ing.percentage.toFixed(1)}%</span>
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: !ing.supplier_id ? "#D97706" : "#64748B", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>
                        {!ing.supplier_id ? "No supplier" : `${ing.supplier_name}${ing.supplier_country ? ` · ${ing.supplier_country}` : ""}`}
                        {ing.supplier_id && ing.supplier_approved === false && (
                          <span style={{ marginLeft: 4, color: "#DC2626", fontWeight: 600 }}>(not approved)</span>
                        )}
                      </p>
                    </div>

                    {/* Allergen tags */}
                    {ing.allergen_codes.slice(0, 2).map((code) => (
                      <span key={code} style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, padding: "2px 5px", borderRadius: 3, backgroundColor: "#FEF3C7", color: "#92400E", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>
                        {code}
                      </span>
                    ))}
                  </div>
                ))}
              </div>

              {/* Link to ingredients library */}
              <div style={{ padding: "12px 16px" }}>
                <a
                  href="/ingredients"
                  style={{ display: "block", width: "100%", height: 44, borderRadius: 8, border: "1px solid #DBEAFE", backgroundColor: "#EFF6FF", color: "#2563EB", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-body), DM Sans, sans-serif", cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  Open Ingredients Library →
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Packaging tab ───────────────────────────────────────────── */}
      {tab === "packaging" && (
        <PackagingTab
          productId={product.id}
          initialPackaging={initialPackaging}
          labelArtworkDocs={labelArtworkDocs}
          onScoreChange={(s) => {
            setScore(s);
          }}
        />
      )}

      {/* ── Template preview sheet ──────────────────────────────────── */}
      {activeTemplate && (
        <TemplatePreviewSheet
          productId={product.id}
          templateType={activeTemplate.type}
          templateName={activeTemplate.name}
          onClose={() => setActiveTemplate(null)}
          onSaved={(doc) => {
            setDocuments((prev) => [doc, ...prev]);
            setActiveTemplate(null);
          }}
        />
      )}

      {/* ── Audit Log tab ───────────────────────────────────────────── */}
      {tab === "audit" && (
        <div style={{ padding: "8px 0" }}>
          {auditLog.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center" }}>
              <p
                style={{
                  fontSize:   13,
                  color:      "#94A3B8",
                  fontFamily: "var(--font-body), DM Sans, sans-serif",
                  margin:     0,
                }}
              >
                No activity recorded yet.
              </p>
            </div>
          ) : (
            auditLog.map((entry) => (
              <div
                key={entry.id}
                style={{
                  backgroundColor: "white",
                  borderBottom:    "1px solid #E2E8F0",
                  padding:         "12px 16px",
                }}
              >
                <p
                  style={{
                    fontSize:   13,
                    fontWeight: 500,
                    color:      "#1E293B",
                    fontFamily: "var(--font-body), DM Sans, sans-serif",
                    margin:     "0 0 4px",
                  }}
                >
                  {entry.description}
                </p>
                <p
                  style={{
                    fontSize:   11,
                    color:      "#94A3B8",
                    fontFamily: "var(--font-body), DM Sans, sans-serif",
                    margin:     0,
                  }}
                >
                  {formatTimestamp(entry.created_at)} · {entry.actor_email}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

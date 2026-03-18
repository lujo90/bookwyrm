"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ScoreGauge from "@/components/ui/ScoreGauge";
import StatusBadge from "@/components/ui/StatusBadge";
import CategoryBar from "@/components/ui/CategoryBar";
import ComplianceAnchor from "@/components/ui/ComplianceAnchor";
import { ChevronDown, ChevronLeft, CheckCircle2 } from "lucide-react";
import type {
  Product,
  ChecklistItem,
  AuditLog,
  ChecklistCategory,
  ScoreResult,
} from "@/types/database";
import { calculateScore } from "@/lib/score/calculateScore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductRecordProps {
  product:      Product;
  initialItems: ChecklistItem[];
  auditLog:     AuditLog[];
  initialScore: ScoreResult;
}

type Tab = "overview" | "documents" | "supply" | "audit";

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
              width:          32,
              height:         32,
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProductRecord({
  product,
  initialItems,
  auditLog,
  initialScore,
}: ProductRecordProps) {
  const router = useRouter();
  const [tab, setTab]           = useState<Tab>("overview");
  const [items, setItems]       = useState<ChecklistItem[]>(initialItems);
  const [score, setScore]       = useState<ScoreResult>(initialScore);
  const [loadingId, setLoadingId] = useState<string | null>(null);

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

  // Next action button logic
  const nextBlockingItem = items
    .filter((i) => i.blocking && !i.completed)
    .sort((a, b) => b.weight - a.weight)[0];

  const nextActionLabel = nextBlockingItem
    ? `Start: ${nextBlockingItem.title}`
    : score.total >= 75
      ? "Start review"
      : "Continue your checklist";

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
        <div style={{ padding: 16 }}>
          <div
            style={{
              backgroundColor: "white",
              borderRadius:    12,
              padding:         24,
              textAlign:       "center",
              border:          "1px solid #E2E8F0",
            }}
          >
            <p style={{ fontSize: 24, margin: "0 0 8px" }}>📄</p>
            <p
              style={{
                fontSize:   14,
                fontWeight: 600,
                color:      "#1E293B",
                fontFamily: "var(--font-body), DM Sans, sans-serif",
                margin:     "0 0 4px",
              }}
            >
              Documents
            </p>
            <p
              style={{
                fontSize:   13,
                color:      "#94A3B8",
                fontFamily: "var(--font-body), DM Sans, sans-serif",
                margin:     0,
              }}
            >
              Coming in Phase 5 — upload spec sheets, lab reports, and certificates.
            </p>
          </div>
        </div>
      )}

      {/* ── Supply Chain tab ────────────────────────────────────────── */}
      {tab === "supply" && (
        <div style={{ padding: 16 }}>
          <div
            style={{
              backgroundColor: "white",
              borderRadius:    12,
              padding:         24,
              textAlign:       "center",
              border:          "1px solid #E2E8F0",
            }}
          >
            <p style={{ fontSize: 24, margin: "0 0 8px" }}>🔗</p>
            <p
              style={{
                fontSize:   14,
                fontWeight: 600,
                color:      "#1E293B",
                fontFamily: "var(--font-body), DM Sans, sans-serif",
                margin:     "0 0 4px",
              }}
            >
              Supply Chain
            </p>
            <p
              style={{
                fontSize:   13,
                color:      "#94A3B8",
                fontFamily: "var(--font-body), DM Sans, sans-serif",
                margin:     0,
              }}
            >
              Coming in Phase 7 — manage suppliers and ingredient traceability.
            </p>
          </div>
        </div>
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

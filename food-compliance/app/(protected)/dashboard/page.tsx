import type { Metadata } from "next";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { SupplyChainEvent } from "@/types/database";

export const metadata: Metadata = { title: "Dashboard" };

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActionItem {
  item_id:     string;
  item_title:  string;
  blocking:    boolean;
  product_id:  string;
  product_name: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get current user + profile to resolve org
  const { data: { user } } = await supabase.auth.getUser();
  let actions: ActionItem[] = [];
  let supplyAlerts: SupplyChainEvent[] = [];

  if (user) {
    // Use explicit type cast to work around TypeScript inference on Supabase generics
    const { data: profileRaw } = await supabase
      .from("profiles")
      .select("organisation_id")
      .eq("id", user.id)
      .single();
    const profile = profileRaw as { organisation_id: string } | null;

    if (profile) {
      // Step 1: get all products for this org (for product name lookup)
      const { data: productsRaw } = await supabase
        .from("products")
        .select("id, name")
        .eq("organisation_id", profile.organisation_id);
      const products = productsRaw as { id: string; name: string }[] | null;

      const productIds = (products ?? []).map((p) => p.id);
      const productNameMap = Object.fromEntries(
        (products ?? []).map((p) => [p.id, p.name]),
      );

      // Fetch unresolved supply chain events (most recent first)
      const db = supabase as any; // eslint-disable-line
      const { data: eventsRaw } = await db
        .from("supply_chain_events")
        .select("*")
        .eq("organisation_id", profile.organisation_id)
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(3);
      supplyAlerts = (eventsRaw ?? []) as SupplyChainEvent[];

      if (productIds.length > 0) {
        // Step 2: fetch top 5 incomplete items for those products
        const { data: rows } = await supabase
          .from("checklist_items")
          .select("id, title, blocking, weight, product_id")
          .in("product_id", productIds)
          .eq("completed", false)
          .order("blocking", { ascending: false })
          .order("weight",   { ascending: false })
          .limit(5);

        if (rows) {
          const typed = rows as { id: string; title: string; blocking: boolean; weight: number; product_id: string }[];
          actions = typed.map((row) => ({
            item_id:      row.id,
            item_title:   row.title,
            blocking:     row.blocking,
            product_id:   row.product_id,
            product_name: productNameMap[row.product_id] ?? "Unknown product",
          }));
        }
      }
    }
  }

  return (
    <AppShell activeTab="dashboard">
      <div style={{ padding: "16px 0" }}>

        {/* ── Zone 1: Today's Actions ─────────────────────────────── */}
        <section style={{ marginBottom: 24 }}>
          <div style={{ padding: "0 16px 10px" }}>
            <h2
              style={{
                fontSize:   13,
                fontWeight: 700,
                color:      "#475569",
                fontFamily: "var(--font-body), DM Sans, sans-serif",
                margin:     0,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Today&apos;s Actions
            </h2>
          </div>

          {actions.length === 0 ? (
            /* Empty state */
            <div
              style={{
                margin:          "0 16px",
                backgroundColor: "#F0FDF4",
                borderRadius:    12,
                padding:         "16px",
                display:         "flex",
                alignItems:      "center",
                gap:             10,
                border:          "1px solid #BBF7D0",
              }}
            >
              <span style={{ fontSize: 18 }}>✅</span>
              <p
                style={{
                  fontSize:   13,
                  color:      "#16A34A",
                  fontFamily: "var(--font-body), DM Sans, sans-serif",
                  margin:     0,
                  fontWeight: 500,
                }}
              >
                All clear — no actions outstanding.
              </p>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "white",
                borderTop:       "1px solid #E2E8F0",
                borderBottom:    "1px solid #E2E8F0",
              }}
            >
              {actions.map((action, idx) => (
                <Link
                  key={action.item_id}
                  href={`/products/${action.product_id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      display:       "flex",
                      alignItems:    "center",
                      gap:           10,
                      padding:       "12px 16px",
                      borderBottom:  idx < actions.length - 1 ? "1px solid #E2E8F0" : "none",
                      backgroundColor: "white",
                    }}
                  >
                    {/* Dot indicator */}
                    <div
                      style={{
                        flexShrink:      0,
                        width:           8,
                        height:          8,
                        borderRadius:    "50%",
                        backgroundColor: action.blocking ? "#DC2626" : "#2563EB",
                      }}
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Product name */}
                      <p
                        style={{
                          fontSize:     11,
                          color:        "#64748B",
                          fontFamily:   "var(--font-body), DM Sans, sans-serif",
                          margin:       "0 0 2px",
                          overflow:     "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace:   "nowrap",
                        }}
                      >
                        {action.product_name}
                      </p>

                      {/* Item title */}
                      <p
                        style={{
                          fontSize:     14,
                          fontWeight:   600,
                          color:        "#1E293B",
                          fontFamily:   "var(--font-body), DM Sans, sans-serif",
                          margin:       0,
                          overflow:     "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace:   "nowrap",
                        }}
                      >
                        {action.item_title}
                      </p>
                    </div>

                    {/* REQUIRED badge */}
                    {action.blocking && (
                      <span
                        style={{
                          flexShrink:      0,
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
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Zone 2: Supply Chain Alerts ─────────────────────────── */}
        {supplyAlerts.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <div style={{ padding: "0 16px 10px" }}>
              <h2
                style={{
                  fontSize: 13, fontWeight: 700, color: "#475569",
                  fontFamily: "var(--font-body), DM Sans, sans-serif",
                  margin: 0, textTransform: "uppercase", letterSpacing: "0.06em",
                }}
              >
                Supply Chain Alerts
              </h2>
            </div>

            <div style={{ backgroundColor: "white", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
              {supplyAlerts.map((ev, idx) => (
                <Link key={ev.id} href="/suppliers" style={{ textDecoration: "none" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", borderBottom: idx < supplyAlerts.length - 1 ? "1px solid #E2E8F0" : "none", backgroundColor: "white" }}>
                    <span style={{ fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>🚨</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "#1E293B", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>
                        {ev.description ?? ev.event_type}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: "#94A3B8", fontFamily: "var(--font-body), DM Sans, sans-serif" }}>
                        {ev.affected_product_ids.length} product(s) affected
                        {" · "}
                        {new Date(ev.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Zone 3: placeholder ─────────────────────────────────── */}
        <section>
          <div style={{ padding: "0 16px 10px" }}>
            <h2
              style={{
                fontSize:   13,
                fontWeight: 700,
                color:      "#475569",
                fontFamily: "var(--font-body), DM Sans, sans-serif",
                margin:     0,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Your Products
            </h2>
          </div>
          <div style={{ padding: "0 16px" }}>
            <Link href="/products" style={{ textDecoration: "none" }}>
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius:    12,
                  padding:         "14px 16px",
                  border:          "1px solid #E2E8F0",
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "space-between",
                }}
              >
                <p
                  style={{
                    fontSize:   14,
                    fontWeight: 500,
                    color:      "#2563EB",
                    fontFamily: "var(--font-body), DM Sans, sans-serif",
                    margin:     0,
                  }}
                >
                  View all products →
                </p>
              </div>
            </Link>
          </div>
        </section>

      </div>
    </AppShell>
  );
}

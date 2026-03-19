import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import ScoreGauge from "@/components/ui/ScoreGauge";
import StatusBadge from "@/components/ui/StatusBadge";
import type { Product } from "@/types/database";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage() {
  const supabase = await createClient();
  const db = supabase as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profileRaw } = await db
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { organisation_id: string } | null;
  if (!profile) notFound();

  const { data: productsRaw } = await db
    .from("products")
    .select("*")
    .eq("organisation_id", profile.organisation_id)
    .order("updated_at", { ascending: false });

  const products = (productsRaw ?? []) as Product[];

  return (
    <AppShell activeTab="products">
      <div style={{ padding: "16px 0" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 16px 12px", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: 18, fontWeight: 700, color: "#1E293B",
              fontFamily: "var(--font-body), DM Sans, sans-serif", margin: "0 0 2px",
            }}>
              Products
            </h1>
            <p style={{
              fontSize: 13, color: "#64748B",
              fontFamily: "var(--font-body), DM Sans, sans-serif", margin: 0,
            }}>
              {products.length} product{products.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/products/new"
            style={{
              display:         "inline-flex",
              alignItems:      "center",
              height:          40,
              padding:         "0 16px",
              borderRadius:    10,
              backgroundColor: "#2563EB",
              color:           "white",
              fontSize:        14,
              fontWeight:      700,
              fontFamily:      "var(--font-body), DM Sans, sans-serif",
              textDecoration:  "none",
              whiteSpace:      "nowrap",
            }}
          >
            + New product
          </Link>
        </div>

        {/* Empty state */}
        {products.length === 0 && (
          <div
            style={{
              margin:          "32px 16px",
              padding:         "40px 24px",
              backgroundColor: "white",
              borderRadius:    14,
              border:          "1px solid #E2E8F0",
              textAlign:       "center",
            }}
          >
            <p style={{
              fontSize: 40, margin: "0 0 12px", lineHeight: 1,
            }}>📦</p>
            <h2 style={{
              fontSize: 16, fontWeight: 700, color: "#1E293B",
              fontFamily: "var(--font-body), DM Sans, sans-serif", margin: "0 0 6px",
            }}>
              No products yet
            </h2>
            <p style={{
              fontSize: 13, color: "#64748B",
              fontFamily: "var(--font-body), DM Sans, sans-serif", margin: "0 0 20px",
              lineHeight: 1.5,
            }}>
              Add your first product to start building your compliance record.
            </p>
            <Link
              href="/products/new"
              style={{
                display:         "inline-flex",
                alignItems:      "center",
                height:          48,
                padding:         "0 24px",
                borderRadius:    12,
                backgroundColor: "#2563EB",
                color:           "white",
                fontSize:        15,
                fontWeight:      700,
                fontFamily:      "var(--font-display), Outfit, sans-serif",
                textDecoration:  "none",
              }}
            >
              Add your first product
            </Link>
          </div>
        )}

        {/* Product list */}
        {products.length > 0 && (
          <div style={{ backgroundColor: "white", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
            {products.map((product, idx) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    display:       "flex",
                    alignItems:    "center",
                    gap:           12,
                    padding:       "14px 16px",
                    borderBottom:  idx < products.length - 1 ? "1px solid #E2E8F0" : "none",
                    minHeight:     64,
                  }}
                >
                  {/* Score gauge */}
                  <div style={{ flexShrink: 0 }}>
                    <ScoreGauge score={product.readiness_score} size="sm" />
                  </div>

                  {/* Name + SKU */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: "0 0 3px",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#1E293B",
                      fontFamily: "var(--font-body), DM Sans, sans-serif",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {product.name}
                    </p>
                    {product.sku && (
                      <p style={{
                        margin: 0, fontSize: 12, color: "#94A3B8",
                        fontFamily: "var(--font-body), DM Sans, sans-serif",
                      }}>
                        SKU: {product.sku}
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <div style={{ flexShrink: 0 }}>
                    <StatusBadge status={product.status} />
                  </div>

                  {/* Chevron */}
                  <span style={{ flexShrink: 0, fontSize: 16, color: "#CBD5E1" }}>›</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

/**
 * Template 4 – Ingredient Traceability Report
 *
 * Maps each ingredient to its supplier. Pure function, no database access.
 */

import type { Product, Formula, Ingredient, Supplier } from "@/types/database";

function css(): string {
  return `
    body  { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1E293B; margin: 24px; }
    h1    { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
    h2    { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
            color: #475569; margin: 24px 0 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
    .meta { font-size: 11px; color: #94A3B8; margin: 0 0 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th    { text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.05em; color: #64748B; padding: 6px 8px;
            background: #F8FAFC; border-bottom: 2px solid #E2E8F0; }
    td    { padding: 6px 8px; border-bottom: 1px solid #F1F5F9; vertical-align: top; }
    .badge   { display:inline-block; border-radius:4px; padding:1px 6px; font-size:10px; font-weight:700; margin-right:3px; }
    .badge-cert { background:#DBEAFE; color:#1D4ED8; }
    .warn   { color: #D97706; font-style: italic; font-size: 12px; }
    .no-supplier { color: #94A3B8; font-style: italic; }
    .footer { margin-top: 32px; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 8px; }
    p { margin: 0 0 8px; line-height: 1.5; }
  `;
}

export interface TraceabilityReportInput {
  product:     Product;
  formula:     Formula | null;
  ingredients: Ingredient[];
  suppliers:   Supplier[];
}

export function generateTraceabilityReport(input: TraceabilityReportInput): string {
  const { product, formula, ingredients, suppliers } = input;

  const supplierMap = new Map<string, Supplier>(
    suppliers.map((s) => [s.id, s]),
  );

  const generatedAt = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const sortedIngredients = [...ingredients].sort((a, b) => a.sort_order - b.sort_order);

  const ingredientRows = sortedIngredients.length > 0
    ? sortedIngredients.map((ing) => {
        const supplier = ing.supplier_id ? supplierMap.get(ing.supplier_id) : null;
        const supplierCell = supplier
          ? `${supplier.name}${supplier.country ? ` (${supplier.country})` : ""}`
          : `<span class="no-supplier">Not assigned</span>`;
        const contactCell = supplier?.contact_email
          ? `<a href="mailto:${supplier.contact_email}" style="color:#2563EB">${supplier.contact_email}</a>`
          : "—";
        const certBadges = supplier?.certifications?.length
          ? supplier.certifications.map((c) => `<span class="badge badge-cert">${c}</span>`).join("")
          : "—";
        const allergenCodes = ing.allergen_codes.length
          ? ing.allergen_codes.join(", ")
          : "None";
        return `
          <tr>
            <td><strong>${ing.name}</strong>${ing.e_numbers.length ? `<br/><small style="color:#94A3B8">${ing.e_numbers.join(", ")}</small>` : ""}</td>
            <td>${ing.percentage.toFixed(2)}%</td>
            <td>${ing.origin_country ?? "—"}</td>
            <td>${supplierCell}</td>
            <td>${contactCell}</td>
            <td>${certBadges}</td>
            <td>${allergenCodes}</td>
          </tr>`;
      }).join("")
    : `<tr><td colspan="7" class="warn">No ingredients added to the formula yet.</td></tr>`;

  // Supplier summary table
  const uniqueSupplierIds = Array.from(new Set(
    sortedIngredients.filter((i) => i.supplier_id).map((i) => i.supplier_id!),
  ));

  const supplierSummaryRows = uniqueSupplierIds.length > 0
    ? uniqueSupplierIds.map((sid) => {
        const s = supplierMap.get(sid);
        if (!s) return "";
        const suppliedIngredients = sortedIngredients
          .filter((i) => i.supplier_id === sid)
          .map((i) => i.name)
          .join(", ");
        return `
          <tr>
            <td><strong>${s.name}</strong></td>
            <td>${s.country ?? "—"}</td>
            <td>${s.contact_email ?? "—"}</td>
            <td>${s.certifications?.join(", ") || "—"}</td>
            <td>${suppliedIngredients}</td>
          </tr>`;
      }).join("")
    : `<tr><td colspan="5" class="no-supplier">No suppliers assigned.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Traceability Report – ${product.name}</title>
  <style>${css()}</style>
</head>
<body>
  <h1>${product.name}</h1>
  <p class="meta">
    Ingredient Traceability Report · Generated ${generatedAt}${product.sku ? ` · SKU: ${product.sku}` : ""}
    ${formula ? ` · Formula v${formula.version}` : ""}
  </p>

  <h2>Ingredient Traceability</h2>
  <table>
    <thead>
      <tr>
        <th>Ingredient</th>
        <th>%</th>
        <th>Origin</th>
        <th>Supplier</th>
        <th>Contact</th>
        <th>Certifications</th>
        <th>Allergens</th>
      </tr>
    </thead>
    <tbody>${ingredientRows}</tbody>
  </table>

  <h2>Supplier Summary</h2>
  <table>
    <thead>
      <tr>
        <th>Supplier</th>
        <th>Country</th>
        <th>Email</th>
        <th>Certifications</th>
        <th>Supplies</th>
      </tr>
    </thead>
    <tbody>${supplierSummaryRows}</tbody>
  </table>

  <div class="footer">
    <p>DRAFT — for internal review only. Confidential traceability record.</p>
    <p>${product.name} · Traceability Report · ${generatedAt}</p>
  </div>
</body>
</html>`;
}

/**
 * Template 3 – Product Specification Sheet
 *
 * Combines product metadata, formula nutritional data, and ingredient list.
 * Pure function, no database access.
 */

import type { Product, Formula, Ingredient } from "@/types/database";
import { generateNutritionalDeclaration } from "./nutritionalDeclaration";

function css(): string {
  return `
    body  { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1E293B; margin: 24px; }
    h1    { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
    h2    { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
            color: #475569; margin: 24px 0 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
    .meta { font-size: 11px; color: #94A3B8; margin: 0 0 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th    { text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.05em; color: #64748B; padding: 6px 8px;
            background: #F8FAFC; border-bottom: 2px solid #E2E8F0; }
    td    { padding: 6px 8px; border-bottom: 1px solid #F1F5F9; vertical-align: top; }
    td.key   { font-weight: 600; width: 40%; }
    td.value { color: #374151; }
    td.right { text-align: right; }
    .badge   { display:inline-block; border-radius:4px; padding:1px 6px; font-size:11px; font-weight:700; }
    .badge-allergen { background:#FEE2E2; color:#DC2626; }
    .badge-organic  { background:#DCFCE7; color:#16A34A; }
    .warn  { color: #D97706; font-style: italic; font-size: 12px; }
    .footer { margin-top: 32px; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 8px; }
    p { margin: 0 0 8px; line-height: 1.5; }
    /* Embed the nutritional table without outer chrome */
    .nutrition-embed body { margin: 0; }
  `;
}

function fmt(val: number | null, decimals = 1): string {
  if (val === null) return "Not declared";
  return val.toFixed(decimals) + " g";
}

export interface ProductSpecInput {
  product:     Product;
  formula:     Formula | null;
  ingredients: Ingredient[];
}

export function generateProductSpec(input: ProductSpecInput): string {
  const { product, formula, ingredients } = input;

  const generatedAt = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  // ── Product details table
  const productRows = [
    ["Product name",    product.name],
    ["SKU",             product.sku ?? "—"],
    ["Category",        product.category ?? "—"],
    ["Status",          product.status.replace("_", " ")],
    ["Target markets",  product.target_markets.join(", ") || "—"],
  ].map(([k, v]) => `<tr><td class="key">${k}</td><td class="value">${v}</td></tr>`).join("");

  // ── Formula details table
  const formulaRows = formula
    ? [
        ["Formula version",    `v${formula.version}`],
        ["Net weight",         formula.net_weight_g ? `${formula.net_weight_g} g` : "—"],
        ["Serving size",       formula.serving_size_g ? `${formula.serving_size_g} g` : "—"],
        ["Shelf life",         formula.shelf_life_days ? `${formula.shelf_life_days} days` : "—"],
        ["Storage conditions", formula.storage_conditions ?? "—"],
        ["Formula status",     formula.is_locked ? "Locked" : "Draft"],
      ].map(([k, v]) => `<tr><td class="key">${k}</td><td class="value">${v}</td></tr>`).join("")
    : `<tr><td colspan="2" class="warn">No formula data yet.</td></tr>`;

  // ── Ingredients table
  const sortedIngredients = [...ingredients].sort((a, b) => a.sort_order - b.sort_order);
  const ingredientRows = sortedIngredients.length > 0
    ? sortedIngredients.map((ing) => {
        const badges = [
          ing.is_allergen ? `<span class="badge badge-allergen">ALLERGEN</span>` : "",
          ing.is_organic  ? `<span class="badge badge-organic">ORGANIC</span>`   : "",
        ].filter(Boolean).join(" ");
        const eCodes = ing.e_numbers.length > 0 ? `<br/><small style="color:#94A3B8">${ing.e_numbers.join(", ")}</small>` : "";
        return `
          <tr>
            <td>${ing.name}${eCodes}</td>
            <td class="right">${ing.percentage.toFixed(2)}%</td>
            <td>${badges || "—"}</td>
            <td>${ing.origin_country ?? "—"}</td>
          </tr>`;
      }).join("")
    : `<tr><td colspan="4" class="warn">No ingredients added yet.</td></tr>`;

  const totalPct = sortedIngredients.reduce((s, i) => s + i.percentage, 0);
  const pctNote  = sortedIngredients.length > 0
    ? `<p style="font-size:11px;color:#64748B">Total: ${totalPct.toFixed(2)}%${Math.abs(totalPct - 100) > 0.1 ? " ⚠ does not sum to 100%" : " ✓"}</p>`
    : "";

  // ── Inline nutritional declaration (reuse template 2 body content only via partial)
  const nutDecl = generateNutritionalDeclaration({ product, formula });
  // Extract just the table portion from the nutritional declaration HTML
  const nutTableMatch = nutDecl.match(/<table[\s\S]*?<\/table>/);
  const nutTable = nutTableMatch ? nutTableMatch[0] : "<p class=\"warn\">Nutritional data not available.</p>";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Product Specification – ${product.name}</title>
  <style>${css()}</style>
</head>
<body>
  <h1>Product Specification Sheet</h1>
  <p class="meta">
    ${product.name}${product.sku ? ` · SKU: ${product.sku}` : ""} · Generated ${generatedAt}
  </p>

  <h2>Product Details</h2>
  <table><tbody>${productRows}</tbody></table>

  <h2>Formula</h2>
  <table><tbody>${formulaRows}</tbody></table>

  <h2>Ingredients</h2>
  <table>
    <thead>
      <tr>
        <th>Ingredient</th>
        <th style="text-align:right">%</th>
        <th>Flags</th>
        <th>Origin</th>
      </tr>
    </thead>
    <tbody>${ingredientRows}</tbody>
  </table>
  ${pctNote}

  <h2>Nutritional Declaration (per 100 g)</h2>
  ${nutTable}

  <div class="footer">
    <p>DRAFT — for internal review only. Not for labelling until verified by a qualified food technologist.</p>
    <p>Confidential — ${product.name} Product Specification · ${generatedAt}</p>
  </div>
</body>
</html>`;
}

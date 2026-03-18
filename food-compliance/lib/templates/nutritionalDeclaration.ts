/**
 * Template 2 – Nutritional Declaration
 *
 * Pure function: accepts typed data, returns an HTML string.
 * Formats as EU 1169/2011 Annex XV mandatory nutritional table.
 * No database access.
 */

import type { Product, Formula } from "@/types/database";

function css(): string {
  return `
    body  { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1E293B; margin: 24px; }
    h1    { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
    h2    { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
            color: #475569; margin: 24px 0 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
    .meta { font-size: 11px; color: #94A3B8; margin: 0 0 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; max-width: 480px; }
    th    { text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.05em; color: #64748B; padding: 6px 8px;
            background: #F8FAFC; border-bottom: 2px solid #E2E8F0; }
    td    { padding: 6px 8px; border-bottom: 1px solid #F1F5F9; }
    td.label  { font-weight: 500; }
    td.sub    { font-weight: 400; padding-left: 20px; color: #475569; }
    td.value  { text-align: right; font-variant-numeric: tabular-nums; }
    td.value-nd { text-align: right; color: #94A3B8; }
    .warn { color: #D97706; font-style: italic; font-size: 12px; margin-top: 8px; }
    .footer { margin-top: 32px; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 8px; }
    p { margin: 0 0 8px; line-height: 1.5; }
  `;
}

function fmt(val: number | null, decimals = 1): string {
  if (val === null) return "–";
  return val.toFixed(decimals);
}

function energyKJ(kcal: number | null): string {
  if (kcal === null) return "–";
  return (kcal * 4.184).toFixed(0);
}

export interface NutritionalDeclarationInput {
  product: Product;
  formula: Formula | null;
}

export function generateNutritionalDeclaration(input: NutritionalDeclarationInput): string {
  const { product, formula } = input;

  const generatedAt = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const hasData = formula && (
    formula.energy_kcal !== null ||
    formula.fat_g !== null ||
    formula.protein_g !== null
  );

  const servingNote = formula?.serving_size_g
    ? `<p>Serving size: <strong>${formula.serving_size_g} g</strong></p>`
    : "";

  const netWeightNote = formula?.net_weight_g
    ? `<p>Net weight: <strong>${formula.net_weight_g} g</strong></p>`
    : "";

  const shelfLifeNote = formula?.shelf_life_days
    ? `<p>Best before: <strong>${formula.shelf_life_days} days</strong> from production</p>`
    : "";

  const storageNote = formula?.storage_conditions
    ? `<p>Storage: <strong>${formula.storage_conditions}</strong></p>`
    : "";

  const table = `
  <table>
    <thead>
      <tr>
        <th>Nutrient</th>
        <th style="text-align:right">Per 100 g</th>
        ${formula?.serving_size_g ? `<th style="text-align:right">Per serving (${formula.serving_size_g} g)</th>` : ""}
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="label">Energy</td>
        <td class="${formula?.energy_kcal !== null ? "value" : "value-nd"}">
          ${energyKJ(formula?.energy_kcal ?? null)} kJ / ${fmt(formula?.energy_kcal ?? null, 0)} kcal
        </td>
        ${formula?.serving_size_g && formula?.energy_kcal !== null
          ? `<td class="value">${(formula.energy_kcal * 4.184 * formula.serving_size_g / 100).toFixed(0)} kJ / ${(formula.energy_kcal * formula.serving_size_g / 100).toFixed(0)} kcal</td>`
          : formula?.serving_size_g ? `<td class="value-nd">–</td>` : ""}
      </tr>
      <tr>
        <td class="label">Fat</td>
        <td class="${formula?.fat_g !== null ? "value" : "value-nd"}">${fmt(formula?.fat_g ?? null)} g</td>
        ${formula?.serving_size_g
          ? `<td class="${formula?.fat_g !== null ? "value" : "value-nd"}">${formula?.fat_g !== null ? fmt(formula.fat_g * formula.serving_size_g / 100) : "–"} g</td>`
          : ""}
      </tr>
      <tr>
        <td class="sub">of which saturates</td>
        <td class="${formula?.saturated_fat_g !== null ? "value" : "value-nd"}">${fmt(formula?.saturated_fat_g ?? null)} g</td>
        ${formula?.serving_size_g
          ? `<td class="${formula?.saturated_fat_g !== null ? "value" : "value-nd"}">${formula?.saturated_fat_g !== null ? fmt(formula.saturated_fat_g * formula.serving_size_g / 100) : "–"} g</td>`
          : ""}
      </tr>
      <tr>
        <td class="label">Carbohydrate</td>
        <td class="${formula?.carbohydrate_g !== null ? "value" : "value-nd"}">${fmt(formula?.carbohydrate_g ?? null)} g</td>
        ${formula?.serving_size_g
          ? `<td class="${formula?.carbohydrate_g !== null ? "value" : "value-nd"}">${formula?.carbohydrate_g !== null ? fmt(formula.carbohydrate_g * formula.serving_size_g / 100) : "–"} g</td>`
          : ""}
      </tr>
      <tr>
        <td class="sub">of which sugars</td>
        <td class="${formula?.sugars_g !== null ? "value" : "value-nd"}">${fmt(formula?.sugars_g ?? null)} g</td>
        ${formula?.serving_size_g
          ? `<td class="${formula?.sugars_g !== null ? "value" : "value-nd"}">${formula?.sugars_g !== null ? fmt(formula.sugars_g * formula.serving_size_g / 100) : "–"} g</td>`
          : ""}
      </tr>
      <tr>
        <td class="label">Fibre</td>
        <td class="${formula?.fibre_g !== null ? "value" : "value-nd"}">${fmt(formula?.fibre_g ?? null)} g</td>
        ${formula?.serving_size_g
          ? `<td class="${formula?.fibre_g !== null ? "value" : "value-nd"}">${formula?.fibre_g !== null ? fmt(formula.fibre_g * formula.serving_size_g / 100) : "–"} g</td>`
          : ""}
      </tr>
      <tr>
        <td class="label">Protein</td>
        <td class="${formula?.protein_g !== null ? "value" : "value-nd"}">${fmt(formula?.protein_g ?? null)} g</td>
        ${formula?.serving_size_g
          ? `<td class="${formula?.protein_g !== null ? "value" : "value-nd"}">${formula?.protein_g !== null ? fmt(formula.protein_g * formula.serving_size_g / 100) : "–"} g</td>`
          : ""}
      </tr>
      <tr>
        <td class="label">Salt</td>
        <td class="${formula?.salt_g !== null ? "value" : "value-nd"}">${fmt(formula?.salt_g ?? null, 2)} g</td>
        ${formula?.serving_size_g
          ? `<td class="${formula?.salt_g !== null ? "value" : "value-nd"}">${formula?.salt_g !== null ? fmt(formula.salt_g * formula.serving_size_g / 100, 2) : "–"} g</td>`
          : ""}
      </tr>
    </tbody>
  </table>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Nutritional Declaration – ${product.name}</title>
  <style>${css()}</style>
</head>
<body>
  <h1>${product.name}</h1>
  <p class="meta">Nutritional Declaration · Generated ${generatedAt}${product.sku ? ` · SKU: ${product.sku}` : ""}</p>

  ${netWeightNote}${servingNote}${shelfLifeNote}${storageNote}

  <h2>Nutrition Information (per 100 g)</h2>
  ${!hasData ? `<p class="warn">⚠ No nutritional data in formula yet. Complete the formula to populate this table.</p>` : ""}
  ${table}

  <div class="footer">
    <p>DRAFT — for internal review only. Not for labelling until verified by a qualified food technologist.</p>
    <p>Regulation: EU 1169/2011 on the provision of food information to consumers, Annex XV.</p>
  </div>
</body>
</html>`;
}

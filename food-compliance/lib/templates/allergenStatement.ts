/**
 * Template 1 – Allergen Statement
 *
 * Pure function: accepts typed data, returns an HTML string.
 * No database access.  All EU 14 major allergens are listed.
 */

import type { Product, Formula, Ingredient } from "@/types/database";

// EU 1169/2011 Annex II — the 14 major allergens
const EU_ALLERGENS: { code: string; label: string }[] = [
  { code: "GLUTEN",     label: "Cereals containing gluten (wheat, rye, barley, oats, spelt, kamut)" },
  { code: "CRUSTACEAN", label: "Crustaceans and products thereof" },
  { code: "EGG",        label: "Eggs and products thereof" },
  { code: "FISH",       label: "Fish and products thereof" },
  { code: "PEANUT",     label: "Peanuts and products thereof" },
  { code: "SOYA",       label: "Soybeans and products thereof" },
  { code: "MILK",       label: "Milk and products thereof (including lactose)" },
  { code: "NUTS",       label: "Nuts (almond, hazelnut, walnut, cashew, pecan, Brazil nut, pistachio, macadamia)" },
  { code: "CELERY",     label: "Celery and products thereof" },
  { code: "MUSTARD",    label: "Mustard and products thereof" },
  { code: "SESAME",     label: "Sesame seeds and products thereof" },
  { code: "SULPHITE",   label: "Sulphur dioxide and sulphites (>10 mg/kg as SO₂)" },
  { code: "LUPIN",      label: "Lupin and products thereof" },
  { code: "MOLLUSC",    label: "Molluscs and products thereof" },
];

function css(): string {
  return `
    body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1E293B; margin: 24px; }
    h1   { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
    h2   { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
           color: #475569; margin: 24px 0 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
    .meta { font-size: 11px; color: #94A3B8; margin: 0 0 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th    { text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.05em; color: #64748B; padding: 6px 8px;
            background: #F8FAFC; border-bottom: 2px solid #E2E8F0; }
    td    { padding: 6px 8px; border-bottom: 1px solid #F1F5F9; vertical-align: top; }
    .present  { color: #DC2626; font-weight: 700; }
    .absent   { color: #94A3B8; }
    .may-contain { color: #D97706; font-weight: 600; }
    .badge-yes  { display:inline-block; background:#FEE2E2; color:#DC2626;
                  border-radius:4px; padding:1px 6px; font-size:11px; font-weight:700; }
    .badge-no   { display:inline-block; background:#F1F5F9; color:#94A3B8;
                  border-radius:4px; padding:1px 6px; font-size:11px; }
    .badge-mc   { display:inline-block; background:#FEF3C7; color:#D97706;
                  border-radius:4px; padding:1px 6px; font-size:11px; font-weight:700; }
    p { margin: 0 0 8px; line-height: 1.5; }
    .footer { margin-top: 32px; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 8px; }
  `;
}

export interface AllergenStatementInput {
  product:     Product;
  formula:     Formula | null;
  ingredients: Ingredient[];
}

export function generateAllergenStatement(input: AllergenStatementInput): string {
  const { product, formula, ingredients } = input;

  // Collect all allergen codes present in ingredients
  const presentCodes = new Set<string>();
  for (const ing of ingredients) {
    for (const code of ing.allergen_codes) {
      presentCodes.add(code.toUpperCase());
    }
  }

  const mayContainCodes = new Set<string>(
    (formula?.may_contain_allergens ?? []).map((c) => c.toUpperCase()),
  );

  const generatedAt = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const rows = EU_ALLERGENS.map(({ code, label }) => {
    const isPresent   = presentCodes.has(code);
    const isMayContain = !isPresent && mayContainCodes.has(code);
    const statusBadge = isPresent
      ? `<span class="badge-yes">CONTAINS</span>`
      : isMayContain
        ? `<span class="badge-mc">MAY CONTAIN</span>`
        : `<span class="badge-no">NOT PRESENT</span>`;
    return `
      <tr>
        <td>${label}</td>
        <td>${statusBadge}</td>
      </tr>`;
  }).join("");

  const presentList = EU_ALLERGENS
    .filter(({ code }) => presentCodes.has(code))
    .map(({ label }) => label);

  const mayContainList = EU_ALLERGENS
    .filter(({ code }) => !presentCodes.has(code) && mayContainCodes.has(code))
    .map(({ label }) => label);

  const summaryParts: string[] = [];
  if (presentList.length > 0) {
    summaryParts.push(
      `<p><strong>Contains:</strong> ${presentList.join("; ")}.</p>`,
    );
  }
  if (mayContainList.length > 0) {
    summaryParts.push(
      `<p class="may-contain"><strong>May contain traces of:</strong> ${mayContainList.join("; ")}.</p>`,
    );
  }
  if (presentList.length === 0 && mayContainList.length === 0) {
    summaryParts.push(
      `<p class="absent">No EU major allergens declared.  Verify ingredient data is complete before publishing.</p>`,
    );
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Allergen Statement – ${product.name}</title>
  <style>${css()}</style>
</head>
<body>
  <h1>${product.name}</h1>
  <p class="meta">Allergen Statement · Generated ${generatedAt}${product.sku ? ` · SKU: ${product.sku}` : ""}</p>

  <h2>Summary</h2>
  ${summaryParts.join("\n  ")}

  <h2>EU 14 Allergen Checklist</h2>
  <table>
    <thead>
      <tr>
        <th>Allergen (EU 1169/2011, Annex II)</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  ${
    ingredients.length === 0
      ? `<p style="color:#D97706;font-style:italic">⚠ No ingredient data available. Add ingredients to the formula for an accurate allergen declaration.</p>`
      : ""
  }

  <div class="footer">
    <p>DRAFT — for internal review only. Not for labelling until verified by a qualified food technologist.</p>
    <p>Regulation: EU 1169/2011 on the provision of food information to consumers, Annex II.</p>
  </div>
</body>
</html>`;
}

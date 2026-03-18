/**
 * Template 5 – HACCP Summary
 *
 * Provides a structured HACCP template pre-filled with the product name and
 * category. All hazard/CCP/monitoring sections are left as editable placeholders
 * for the food safety team to complete. Pure function, no database access.
 */

import type { Product } from "@/types/database";

function css(): string {
  return `
    body  { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1E293B; margin: 24px; }
    h1    { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
    h2    { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
            color: #475569; margin: 28px 0 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
    h3    { font-size: 13px; font-weight: 600; color: #374151; margin: 16px 0 6px; }
    .meta { font-size: 11px; color: #94A3B8; margin: 0 0 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th    { text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.05em; color: #64748B; padding: 6px 8px;
            background: #F8FAFC; border-bottom: 2px solid #E2E8F0; }
    td    { padding: 8px; border-bottom: 1px solid #F1F5F9; vertical-align: top; min-height: 32px; }
    td.key   { font-weight: 600; width: 35%; }
    td.fill  { color: #94A3B8; font-style: italic; }
    .placeholder { background: #FFFBEB; border: 1px dashed #FCD34D;
                   border-radius: 4px; padding: 6px 8px; color: #92400E; font-style: italic; }
    .step-num    { display:inline-block; background:#2563EB; color:white;
                   border-radius:50%; width:20px; height:20px; text-align:center;
                   line-height:20px; font-size:11px; font-weight:700; margin-right:6px; }
    ul { margin: 4px 0; padding-left: 20px; }
    li { margin-bottom: 4px; }
    .footer { margin-top: 32px; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 8px; }
    p  { margin: 0 0 8px; line-height: 1.5; }
  `;
}

function placeholder(text: string): string {
  return `<span class="placeholder">[${text}]</span>`;
}

export interface HaccpSummaryInput {
  product: Product;
}

export function generateHaccpSummary(input: HaccpSummaryInput): string {
  const { product } = input;

  const generatedAt = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  // Generic process steps for a food product — team fills in CCPs
  const processSteps = [
    "Raw material receipt and inspection",
    "Ingredient storage",
    "Weighing and batching",
    "Processing / mixing / cooking",
    "Cooling / chilling",
    "Filling / packaging",
    "Metal detection / X-ray",
    "Labelling",
    "Finished goods storage",
    "Dispatch and distribution",
  ];

  const processStepRows = processSteps.map((step, i) => `
    <tr>
      <td><span class="step-num">${i + 1}</span>${step}</td>
      <td class="fill">${placeholder("Biological / Chemical / Physical hazards")}</td>
      <td class="fill">${placeholder("Yes / No")}</td>
      <td class="fill">${placeholder("Critical limit, e.g. core temp ≥ 75 °C")}</td>
      <td class="fill">${placeholder("Monitoring procedure")}</td>
      <td class="fill">${placeholder("Corrective action")}</td>
    </tr>`).join("");

  const productDescRows = [
    ["Product name",       product.name],
    ["SKU",                product.sku ?? placeholder("Enter SKU")],
    ["Category",           product.category ?? placeholder("Enter food category")],
    ["Target markets",     product.target_markets.join(", ") || placeholder("Enter target markets")],
    ["Intended use",       placeholder("Describe intended consumers and use, e.g. 'General population, ready to eat'")],
    ["Distribution",       placeholder("Ambient / Chilled / Frozen")],
    ["Shelf life",         placeholder("e.g. 12 months from production")],
    ["Packaging",          placeholder("e.g. Modified atmosphere packaging in sealed tray")],
  ].map(([k, v]) => `<tr><td class="key">${k}</td><td>${v}</td></tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>HACCP Summary – ${product.name}</title>
  <style>${css()}</style>
</head>
<body>
  <h1>HACCP Summary Plan</h1>
  <p class="meta">
    ${product.name} · Generated ${generatedAt}${product.sku ? ` · SKU: ${product.sku}` : ""}
  </p>

  <h2>1. Product Description</h2>
  <table><tbody>${productDescRows}</tbody></table>

  <h2>2. Scope and Intended Use</h2>
  <div class="placeholder">
    Describe the scope of this HACCP plan (e.g. covers manufacturing from raw material receipt through to
    finished goods despatch at [site name]).  State the intended consumers (e.g. general public, including
    vulnerable groups) and any foreseeable misuse.
  </div>

  <h2>3. Process Flow Diagram</h2>
  <div class="placeholder">
    Insert or attach the verified process flow diagram here.  Each step should correspond to a row in the
    hazard analysis table below.
  </div>

  <h2>4. Hazard Analysis &amp; Critical Control Points</h2>
  <table>
    <thead>
      <tr>
        <th>Process Step</th>
        <th>Potential Hazards</th>
        <th>CCP?</th>
        <th>Critical Limit</th>
        <th>Monitoring</th>
        <th>Corrective Action</th>
      </tr>
    </thead>
    <tbody>${processStepRows}</tbody>
  </table>

  <h2>5. Verification Procedures</h2>
  <div class="placeholder">
    Describe how HACCP plan effectiveness will be verified, e.g. internal audits, microbiological testing
    frequency, calibration records for monitoring equipment.
  </div>

  <h2>6. Record Keeping</h2>
  <div class="placeholder">
    List all HACCP records and their retention periods, e.g. CCP monitoring logs (2 years),
    corrective action reports (2 years), validation studies (product lifetime + 1 year).
  </div>

  <h2>7. Review Schedule</h2>
  <table>
    <tbody>
      <tr><td class="key">Review frequency</td><td class="fill">${placeholder("e.g. Annual, or on product/process change")}</td></tr>
      <tr><td class="key">Last reviewed</td><td class="fill">${placeholder("DD Month YYYY")}</td></tr>
      <tr><td class="key">Next review due</td><td class="fill">${placeholder("DD Month YYYY")}</td></tr>
      <tr><td class="key">HACCP team lead</td><td class="fill">${placeholder("Name and role")}</td></tr>
    </tbody>
  </table>

  <h2>8. HACCP Team Sign-off</h2>
  <table>
    <thead>
      <tr><th>Name</th><th>Role</th><th>Signature</th><th>Date</th></tr>
    </thead>
    <tbody>
      <tr>
        <td class="fill">${placeholder("Name")}</td>
        <td class="fill">${placeholder("Role")}</td>
        <td></td>
        <td class="fill">${placeholder("Date")}</td>
      </tr>
      <tr>
        <td class="fill">${placeholder("Name")}</td>
        <td class="fill">${placeholder("Role")}</td>
        <td></td>
        <td class="fill">${placeholder("Date")}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>DRAFT — for internal review only. Must be reviewed and signed off by the HACCP team before use.</p>
    <p>Regulation: Regulation (EC) No 852/2004 on the hygiene of foodstuffs, Article 5 (HACCP).</p>
    <p>${product.name} · HACCP Summary · ${generatedAt}</p>
  </div>
</body>
</html>`;
}

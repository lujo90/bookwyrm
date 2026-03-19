# Phase 8: Packaging Record — Implementation Plan

## Overview
6 files: 1 migration, 1 type update, 1 API route, 1 new client component, 2 file edits.

---

## File 1 — `supabase/migrations/010_packaging.sql` (NEW)

Exact schema from the spec, numbered 010 (next after 009). Adds a `label_artwork`
document type to the `document_type` enum first (needed for label_document_id FK
and for the document-picker in Section 4), then creates the `packaging` table with
the `set_updated_at` trigger and RLS policy.

---

## File 2 — `types/database.ts` (MODIFY)

Two changes:
1. Add `"label_artwork"` to the `DocumentType` union.
2. Add a `Packaging` interface mirroring the migration columns.
3. Add `packaging` to the `Database` helper type's Tables map.

---

## File 3 — `app/api/products/[id]/packaging/route.ts` (NEW)

Two handlers:

**GET** — fetch the packaging row for this product (returns `{ packaging: Packaging | null }`).

**PUT** — upsert the packaging row, then:
  1. For each field group that is now set, find the matching `checklist_items` row
     by category `"packaging"` + partial title match (case-insensitive) and mark it
     complete (sets `completed = true`, `completed_at`, `completed_by`).
     Matching rules:
     - `primary_material` set → title contains "packaging material"
     - `recyclability_code` set → title contains "recyclability"
     - `ppwr_compliant = true` → title contains "ppwr"
     - `barcode` set → title contains "barcode"
  2. Fetch all checklist items, recalculate score with `calculateScore()`, persist
     `readiness_score` + `readiness_breakdown` on the product.
  3. Write an `audit_log` entry (`action_type: "packaging_updated"`).
  4. Return `{ packaging, score }`.

No separate score endpoint call needed — the PUT does it inline, same pattern as
the checklist item PATCH route.

---

## File 4 — `app/(protected)/products/[id]/PackagingTab.tsx` (NEW)

Client component. Props: `productId`, `initialPackaging`, `labelArtworkDocs`.

Four collapsible section cards (always-expanded on first render, can be toggled):

**Section 1 — Primary Packaging**
- Primary material: `<select>` with 9 options (Glass, PET Plastic, HDPE Plastic,
  PP Plastic, Aluminium, Tin Steel, Card and Paperboard, Flexible Film, Other)
- Weight of primary packaging (g): `<input type="number">`
- Recyclability code: `<select>` with EU codes
  (01 PET, 02 HDPE, 03 PVC, 04 LDPE, 05 PP, 06 PS, 07 O, GL Glass,
   ALU Aluminium, PAP Paper/Board)
- ComplianceAnchor: EU 2022/1616 (PPWR) · "Recyclability information"
- Help text below anchor: "EU PPWR requires all packaging to display recyclability
  information from 2025."

**Section 2 — Secondary Packaging**
- Secondary material: `<input type="text">` (free text)
- Weight of secondary packaging (g): `<input type="number">`

**Section 3 — PPWR Compliance**
- PPWR compliant: three-button toggle (Yes / No / Not sure)
  - Selected state: filled blue / filled red / filled slate
- Recycled content %: `<input type="number" min="0" max="100">`
- ComplianceAnchor: EU 2022/1616
- Help text: "From 2030, minimum recycled content requirements apply.
  Recording this now prepares you for the transition."

**Section 4 — Label & Barcode**
- Label dimensions: `<input type="text">` (free text, e.g. "80mm × 120mm")
- Link label artwork: `<select>` populated from `labelArtworkDocs` (documents of
  type `label_artwork`), value = document id
- Barcode: `<input type="text" maxLength={13}>`
  — live-validates EAN-13 (13 digits) with inline error if malformed
- Barcode type: three-button toggle (EAN-13 / EAN-8 / QR code)

**Save behaviour:** Single "Save packaging" button at the bottom of all sections
(not per-section). Calls `PUT /api/products/[id]/packaging`. On success, updates
local score state via a callback prop (`onScoreChange`). Optimistic save state
(button shows "Saving…" → "Saved ✓" for 2 s). Error message on failure.

**Style:** Each section uses an inline card (white bg, 12px border-radius,
1px #E2E8F0 border, 16px padding, 12px margin-bottom). Section heading is
`11px / 700 / uppercase / #64748B`. Inputs use the same shared `inputStyle` as
the rest of the codebase. No QuestionCard wizard frame — this is an embedded
tab, not a full-screen flow. The ComplianceAnchor component is imported as-is.

---

## File 5 — `ProductRecord.tsx` (MODIFY)

Three changes:

**a) Props:** Add `initialPackaging: Packaging | null`, `labelArtworkDocs: DocumentWithUrl[]`,
and the `onScoreChange` wiring (score state is already local, so PackagingTab
receives `setScore` via a callback).

**b) Tab bar:** Add `{ key: "packaging", label: "Packaging" }` after "Supply Chain".
Tab type becomes `"overview" | "documents" | "supply" | "packaging" | "audit"`.

**c) Packaging tab panel:**
```
{tab === "packaging" && (
  <PackagingTab
    productId={product.id}
    initialPackaging={initialPackaging}
    labelArtworkDocs={labelArtworkDocs}
    onScoreChange={setScore}
  />
)}
```

**d) Overview tab — packaging summary card:** Inserted between the "next action
button" block and the category progress bars. Only rendered when
`initialPackaging` is non-null and has at least `primary_material` set.

Card layout (white bg, 12px border-radius, 1px border, 16px padding):
- Row 1: "📦 Primary: {material}" + recyclability code chip (if set)
- Row 2: PPWR badge (green "PPWR ✓" / red "PPWR ✗" / slate "PPWR ?") + barcode
  text if set
- "→ Go to Packaging" link that calls `setTab("packaging")`

---

## File 6 — `products/[id]/page.tsx` (MODIFY)

Fetch the packaging row and label_artwork documents server-side, pass as props:

```ts
const { data: packagingRaw } = await supabaseAny
  .from("packaging")
  .select("*")
  .eq("product_id", params.id)
  .maybeSingle();
const initialPackaging = packagingRaw as Packaging | null;

const { data: labelDocsRaw } = await supabase
  .from("documents")
  .select("*")
  .eq("product_id", params.id)
  .eq("type", "label_artwork");
// attach signed URLs same as existing documents logic
```

Pass both as new props to `<ProductRecord>`.

---

## Checklist item title matching (PUT /api/products/[id]/packaging)

The PUT handler looks up checklist items by `category = "packaging"` and partial
title match. If the seed data uses exact titles like "Record packaging material",
"Record recyclability code", "Confirm PPWR compliance", "Assign barcode", the
`includes()` match (lowercased) will find them. If an item is already complete,
we skip the update to avoid spurious audit log entries.

---

## Migration note

The spec names this migration 011 but our sequence is 001–009. Using **010** to
maintain sequential order. No gap.

The `document_type` enum change: PostgreSQL requires `ALTER TYPE ... ADD VALUE`.
This is placed at the top of 010_packaging.sql before the table creation.

---

## What is NOT included (out of scope for Phase 8)

- Packaging template generation (spec sheet with packaging data)
- Packaging history / versioning
- Admin-level packaging audit

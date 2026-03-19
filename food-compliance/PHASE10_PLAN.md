# Phase 10: Change Management — Implementation Plan

## Overview

8 files: 1 core library, 5 new API routes, 1 API route modification, 1 UI component.

No new migrations needed — all cascades operate on existing tables
(checklist_items, formulas, ingredients, documents, audit_log).

---

## Key Design Decisions

### 1. CascadeResult shape (consistent across all functions)
```ts
interface CascadeResult {
  itemsReset:    string[];    // titles of checklist items that were reset
  notifications: string[];   // human-readable sentences for the ChangeAlert banner
  score:         ScoreResult | null;  // recalculated score (null if no product context)
}
```

### 2. Notification delivery
Cascade functions are server-side. They return `notifications[]` inside
`CascadeResult`. The API route includes this in its JSON response body.
The client (ProductRecord) reads the response and stores notifications in
component state → shows `<ChangeAlert>`. No persistent alert store needed
(Phase 11 adds persistent alerts; Phase 10 only needs ephemeral banners).

### 3. Document expiry
Next.js has no native cron. `onDocumentExpired` is wired to a
`POST /api/products/[id]/documents/check-expiry` endpoint. This can be
called:
- From the product page server component at load time (server action)
- From a future external cron (Supabase Edge Functions / Vercel cron)
It checks documents with `expiry_date < now()`, calls `onDocumentExpired`
for each, and returns a list of newly-reset items.

### 4. Formula routes (don't exist yet — must be created)
There are no formula API routes. Phase 10 creates the minimum set needed
to wire the cascade functions. This is necessary because the spec says
"connect each function to the relevant API routes."

### 5. `onDocumentVersionUploaded` scope
The documents table has no `status` column ("archived", "under_review")
and checklist items have no "auto_filled" state. Phase 10 implements
the core observable behaviour: when a new document of a type that
previously had an evidence-linked checklist item is uploaded, reset
that item to incomplete. The "archived/under_review" versioning is
deferred to a future phase.

---

## File 1 — `lib/changes/cascadeHandler.ts` (NEW)

Single file, six exported async functions. All take a Supabase `db` client
(same `as any` pattern as existing cascade.ts). All return `CascadeResult`.

### `onIngredientAdded(productId, ingredient, db, actorEmail, actorId)`
1. Fetch the active formula for productId; get current `allergen_codes[]`
   across ALL its ingredients.
2. If `ingredient.allergen_codes` contains codes not already in the union:
   - Find checklist items with category `"formula"` where title contains
     `"allergen"` (case-insensitive); reset each completed one to incomplete.
3. Find items with category `"compliance"` where title contains
   `"allergen declaration"` — reset if complete.
4. Recalculate score via `calculateScore`.
5. Write audit_log: `action_type: "ingredient_added_cascade"`.
6. Return `CascadeResult` with reset item titles and notification string:
   `"You added [name]. Please confirm your allergen declaration is still accurate."`

### `onIngredientRemoved(productId, ingredient, db, actorEmail, actorId)`
1. After ingredient is deleted, fetch remaining ingredients from the formula.
2. Compute new allergen union from remaining ingredients.
3. Compute old allergen union = new union ∪ ingredient.allergen_codes.
4. If old ≠ new (allergens changed):
   - Reset allergen confirmation items (same title matching as above).
5. Recalculate score. Write audit_log. Return CascadeResult.
   Notification: `"[name] removed. Allergen declaration has been reset for review."`

### `onNutritionalDataChanged(productId, formulaIsLocked, db, actorEmail, actorId)`
Items to reset (category `"formula"` or `"compliance"`, title matching):
- If formula is locked: items containing `"nutritional values"` or `"enter nutritional"`
- Always: items containing `"nutritional declaration"` (compliance category)
Recalculate score. Write audit_log: `"nutritional_data_cascade"`.
Notification: `"Nutritional data changed. Please re-verify your label."`

### `onFormulaVersionCreated(productId, oldVersion, newVersion, db, actorEmail, actorId)`
Resets these items (matched by partial title, case-insensitive):
- `"label artwork"` (documents category)
- `"allergen declaration on label"` (compliance category)
- `"nutritional declaration on label"` (compliance category)
- `"fic"` OR `"label format"` (compliance category)
For each reset, writes a separate audit_log entry:
`action_type: "formula_version_cascade"`.
Recalculates score. Returns CascadeResult with all reset titles.
Notification: `"Formula v{newVersion} created. {n} item(s) reset: [list]."`

### `onDocumentExpired(documentId, db)`
1. Fetch document by id (get product_id, type, name).
2. Find checklist items for that product where `evidence_document_id = documentId`.
3. Reset each completed item to incomplete.
4. Recalculate score. Write audit_log: `"document_expired_checklist_reset"`.
5. Return CascadeResult. (Phase 11 will persist alerts; Phase 10 just resets + logs.)

### `onDocumentVersionUploaded(productId, documentType, db, actorEmail, actorId)`
1. Find checklist items for this product where category `"documents"` and
   title loosely matches the document type (e.g. `"spec_sheet"` → title
   contains `"spec sheet"`; `"certificate"` → title contains `"certificate"`;
   `"lab_report"` → title contains `"lab report"`).
2. Reset matching completed items to incomplete.
3. Recalculate score. Write audit_log: `"document_version_cascade"`.
4. Return CascadeResult.
   Notification: `"A new [type] was uploaded. The linked checklist item has been reset for re-review."`

---

## File 2 — `app/api/products/[id]/formula/route.ts` (NEW)

**GET** — fetch the active formula for this product.
Returns `{ formula: Formula | null }`.

**PATCH** — update nutritional data on the active formula.
Body: partial nutritional fields (energy_kcal, fat_g, …, salt_g).
After saving, calls `onNutritionalDataChanged(productId, formula.is_locked, db, …)`.
Returns `{ formula, cascade: CascadeResult }`.

---

## File 3 — `app/api/products/[id]/formula/ingredients/route.ts` (NEW)

**GET** — list ingredients for the product's active formula.

**POST** — add a new ingredient to the active formula.
Body: `{ name, percentage, supplier_id?, allergen_codes?, is_allergen?, ... }`.
After insert, calls `onIngredientAdded(productId, newIngredient, db, …)`.
Returns `{ ingredient, cascade: CascadeResult }`.

---

## File 4 — `app/api/products/[id]/formula/ingredients/[ingredientId]/route.ts` (NEW)

**PATCH** — update ingredient fields (percentage, supplier_id, allergen_codes, etc.).
If allergen_codes changed, calls `onIngredientAdded` or `onIngredientRemoved`
depending on whether allergens were added or removed.

**DELETE** — remove ingredient from formula.
After delete, calls `onIngredientRemoved(productId, deletedIngredient, db, …)`.
Returns `{ cascade: CascadeResult }`.

---

## File 5 — `app/api/products/[id]/formula/version/route.ts` (NEW)

**POST** — create a new formula version.
1. Fetch current active formula.
2. Clone it as a new row with `version + 1`, `is_active = true`.
3. Set old formula `is_active = false`.
4. Call `onFormulaVersionCreated(productId, oldVersion, newVersion, db, …)`.
Returns `{ formula: newFormula, cascade: CascadeResult }`.

---

## File 6 — `app/api/products/[id]/documents/check-expiry/route.ts` (NEW)

**POST** — check for expired documents and trigger cascades.
1. Fetch documents for this product where `expiry_date IS NOT NULL AND expiry_date < now()`.
2. For each expired doc, call `onDocumentExpired(doc.id, db)`.
3. Aggregate all CascadeResults.
Returns `{ expired: number, itemsReset: string[], notifications: string[] }`.

---

## File 7 — `app/api/products/[id]/documents/route.ts` (MODIFY)

In the existing POST handler, after successfully inserting the document record:
- Check if any other document of the same `type` already exists for this product.
- If yes: call `onDocumentVersionUploaded(productId, type, db, …)`.
- Merge the returned `CascadeResult` into the POST response:
  `{ document, cascade: CascadeResult | null }`.

---

## File 8 — `components/ui/ChangeAlert.tsx` (NEW)

Client component. Props:
```ts
interface ChangeAlertProps {
  notifications: string[];       // one sentence per changed item
  onDismiss:     () => void;
}
```

Renders a yellow sticky banner directly below the product name in the header
(placed inside ProductRecord above the TabBar, conditional on `notifications.length > 0`).

Visual design:
- Background: `#FFFBEB`, border-bottom: `1px solid #FDE68A`
- Icon: ⚠️, followed by a bold first notification, then a collapsed list
  showing remaining items ("+2 more" chip, expandable)
- Dismiss button (×) top-right calls `onDismiss()`

**Integration in ProductRecord:**
- Add `cascadeNotifications` state: `useState<string[]>([])`
- Whenever a tab action returns a `cascade.notifications` array:
  `setCascadeNotifications((prev) => [...prev, ...cascade.notifications])`
- Render `<ChangeAlert notifications={cascadeNotifications} onDismiss={() => setCascadeNotifications([])} />`
  between the header and the TabBar when `cascadeNotifications.length > 0`

---

## Checklist item title matching (full table)

| Cascade trigger | Category | Title match (partial, case-insensitive) |
|---|---|---|
| Allergen change | formula | "allergen" |
| Allergen change | compliance | "allergen declaration" |
| Nutritional change (locked) | formula | "nutritional value" OR "enter nutritional" |
| Nutritional change (always) | compliance | "nutritional declaration" |
| Formula version | documents | "label artwork" |
| Formula version | compliance | "allergen declaration on label" |
| Formula version | compliance | "nutritional declaration on label" |
| Formula version | compliance | "fic" OR "label format" |
| Document version | documents | matches document type name |
| Document expired | any | item.evidence_document_id = expired doc id |
| Supplier revoked | suppliers | "approved suppliers" (existing Phase 7) |

---

## What is NOT in scope for Phase 10

- Persistent alert store / alerts table (Phase 11)
- Formula editor UI (formulas only wired via API in this phase)
- Ingredient editor UI (same)
- Document status columns (archived / under_review)
- Checklist item `auto_filled` state

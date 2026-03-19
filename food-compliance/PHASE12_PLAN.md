# Phase 12: Review Flow — Implementation Plan

## Overview
A Taxfix-style guided review triggered when `readiness_score >= 75`. Steps are generated dynamically from product data. State is persisted in two new DB tables. Each confirmation is logged to `audit_log`. Completion sets `product.status = 'approved'`.

---

## 1. Database — `supabase/migrations/012_reviews.sql`

Exactly as specified in the brief:
- `reviews` table: `id, product_id, status DEFAULT 'in_progress', started_at, completed_at, completed_by, current_step DEFAULT 0, total_steps, created_at`
- `review_confirmations` table: `id, review_id, step, item_type, item_id, question, confirmed, confirmed_at, confirmed_by, note`
- RLS on both tables scoped to `organisation_id` via product chain

---

## 2. Types — `types/database.ts`

Add two interfaces:

```typescript
export interface Review {
  id: string; product_id: string; status: string;
  started_at: string; completed_at: string | null; completed_by: string | null;
  current_step: number; total_steps: number | null; created_at: string;
}

export interface ReviewConfirmation {
  id: string; review_id: string; step: number;
  item_type: string; item_id: string | null; question: string;
  confirmed: boolean; confirmed_at: string; confirmed_by: string; note: string | null;
}
```

Add `reviews` and `review_confirmations` to the `Database` helper type.

---

## 3. API Routes

### `app/api/products/[id]/reviews/route.ts`
- **GET** — Returns the active `in_progress` review for the product (or `null` if none).
- **POST** — Creates a new review. Also sets `products.status = 'in_review'`. Body: `{ total_steps: number }`. Returns `{ review }`.

### `app/api/products/[id]/reviews/[reviewId]/route.ts`
- **PATCH** — Updates `current_step`, and optionally `status`, `completed_at`, `completed_by`. Used both for step-saves and completion.

### `app/api/products/[id]/reviews/[reviewId]/confirmations/route.ts`
- **POST** — Inserts a `review_confirmations` row. Also inserts an `audit_log` row with `action_type = 'review_confirmation'` and metadata containing `{ question, confirmed, step, note }`. Body: `{ step, item_type, item_id?, question, confirmed, note? }`.

---

## 4. Review Page — Server Component

### `app/(protected)/products/[id]/review/page.tsx`

Fetches everything needed to build the steps server-side, then passes a serialized `ReviewStep[]` array to the client:

**Data fetched:**
1. Product (for name, status)
2. Active formula (nutritional values, `is_locked`)
3. Ingredients with allergen codes (union of all `allergen_codes` arrays)
4. Documents: most recent `label_artwork`, most recent `spec_sheet` (HACCP proxy), all `certificate` docs
5. Suppliers: count of linked suppliers + how many are approved
6. Active review from `reviews` table (to resume from correct step)
7. Most recent completed compliance checklist item (for "last regulation check" date)
8. Auth user email (for `confirmed_by`)

**Step generation logic (in order):**

| Step | Always? | Condition |
|------|---------|-----------|
| Allergen confirmation | Yes | — (empty allergens shows "no allergens declared") |
| Label artwork | Yes | — (shown even if no doc: question changes to "Have you uploaded your label artwork?") |
| HACCP document | Yes | — (same pattern if no doc) |
| Nutritional declaration | Yes | — |
| Supplier confirmation | Conditional | `suppliers.length > 0` |
| Certifications | Conditional | One step per `certificate` document |
| Regulation check | Conditional | Any compliance checklist item exists |

Each step serialised as:
```typescript
interface ReviewStep {
  type: string;          // 'allergens' | 'label_artwork' | 'haccp' | 'nutritional' | 'suppliers' | 'certification' | 'regulation'
  question: string;      // Fully interpolated question text
  navigateTo: string;    // e.g. '#formula' or '#documents' — passed to "No" handler
  itemType: string;
  itemId: string | null; // document id for certs/label
  metadata: Record<string, unknown>; // extra display data if needed
}
```

---

## 5. Review Flow — Client Component

### `app/(protected)/products/[id]/review/ReviewFlowClient.tsx`

**State:**
- `stepIndex: number` — initialised from `review.current_step`
- `pendingAnswer: boolean | null` — Yes = true, No = false
- `saving: boolean`

**Per-screen render** using `QuestionCard`:
- `step={stepIndex + 1}`, `totalSteps={steps.length}`
- `question={steps[stepIndex].question}`
- `contextLine` = step type label (e.g. "Allergen Declaration")
- Children = two large Yes / No buttons (replace the default `Continue` button via `onContinue` override approach)

**Yes / No buttons** — rendered as children inside QuestionCard's input slot, styled as two stacked 52px buttons (blue = Yes, slate outline = No), each min-height 52px for mobile tap targets. Selecting one sets `pendingAnswer` and enables the QuestionCard's `canContinue`.

**"Yes" flow:**
1. POST confirmation (`confirmed: true`) to confirmations route
2. PATCH review `current_step` to `stepIndex + 1`
3. Advance `stepIndex`

**"No" flow:**
1. POST confirmation (`confirmed: false`) to confirmations route
2. PATCH review `current_step = stepIndex` (save progress)
3. `router.push('/products/{id}#{navigateTo}')` — navigates away with hash
4. Shows inline message: "Update [X], then return to continue your review." before navigating

**Resume:** The page always reads `review.current_step` from the server and initialises `stepIndex` from it. No additional logic needed — navigating back to `/products/[id]/review` continues from the saved step.

**Completion (after final step confirmed):**
1. PATCH review: `{ status: 'completed', completed_at: now, completed_by: email }`
2. PATCH product: `{ status: 'approved' }` if `blockingIncomplete.length === 0`
3. Show completion screen (no QuestionCard — custom full-screen layout):
   - Large green checkmark SVG (64px)
   - Heading: "Review complete."
   - Body: "Your score is now 100%. Your compliance pack is ready."
   - Button: "Download Compliance Pack" (disabled/coming soon — Phase 13)
   - Secondary link: "Back to product"

---

## 6. Product Page — Overview Tab Integration

### `app/(protected)/products/[id]/page.tsx` (modified)

Add fetch for active review:
```typescript
const { data: reviewRaw } = await supabaseAny
  .from('reviews')
  .select('*')
  .eq('product_id', params.id)
  .eq('status', 'in_progress')
  .maybeSingle();
const activeReview = (reviewRaw ?? null) as Review | null;
```

Pass `activeReview` prop to `<ProductRecord>`.

### `app/(protected)/products/[id]/ProductRecord.tsx` (modified)

Add `activeReview?: Review | null` to `ProductRecordProps`.

In the Overview tab, between the "Next action button" and the packaging summary card, add:

**Case A — score >= 75, no active review:**
Large blue card:
```
┌─────────────────────────────────────┐
│  Your product is nearly ready.      │  (700 weight)
│  Let us check everything together.  │  (grey, 13px)
│  This takes about 5 minutes.        │
│  [Start Review]                     │  (full-width blue button)
└─────────────────────────────────────┘
```
Clicking "Start Review" navigates to `/products/{id}/review`.

**Case B — active review in_progress:**
Slim amber banner with "Resume Review →" link to `/products/{id}/review`.

The existing "Next action button" already says "Start review" at score >= 75; we replace its `onClick` to navigate to `/products/{id}/review` when `score.total >= 75 && !nextBlockingItem`.

---

## 7. Audit Log Tab Integration

No structural changes needed. Every `review_confirmation` POST writes a row to `audit_log` with:
- `action_type: 'review_confirmation'`
- `description: 'Review step {N}: "{question}" — confirmed {Yes/No}'`
- `metadata: { step, question, confirmed, note }`

These appear automatically in the existing Audit Log tab render.

---

## 8. File Changelist

| File | Action |
|------|--------|
| `supabase/migrations/012_reviews.sql` | **NEW** |
| `types/database.ts` | **MODIFIED** — add Review, ReviewConfirmation interfaces |
| `app/api/products/[id]/reviews/route.ts` | **NEW** |
| `app/api/products/[id]/reviews/[reviewId]/route.ts` | **NEW** |
| `app/api/products/[id]/reviews/[reviewId]/confirmations/route.ts` | **NEW** |
| `app/(protected)/products/[id]/review/page.tsx` | **NEW** |
| `app/(protected)/products/[id]/review/ReviewFlowClient.tsx` | **NEW** |
| `app/(protected)/products/[id]/page.tsx` | **MODIFIED** — fetch activeReview |
| `app/(protected)/products/[id]/ProductRecord.tsx` | **MODIFIED** — review card, resume banner, onClick on next-action |

Total: 5 new files, 4 modified files.

---

## 9. Mobile Considerations

- QuestionCard already uses `minHeight: 100vh` — full-screen per step ✓
- Yes/No buttons: `min-height: 52px`, `border-radius: 12px`, full-width ✓
- Progress bar at top of QuestionCard already implemented ✓
- Completion screen: centered, large tap target buttons ✓

---

## 10. Definition of Done Checklist

- [ ] Review card appears on Overview when score >= 75
- [ ] "Start Review" creates a review record and navigates to /review
- [ ] Each step renders correct data from the product record
- [ ] Yes logs confirmation + audit_log entry, advances step
- [ ] No saves progress, navigates to correct tab, shows message
- [ ] Returning to /review resumes from saved step
- [ ] Completion sets product.status = 'approved' (if no blocking items)
- [ ] Review confirmations visible in Audit Log tab
- [ ] Works on mobile (52px tap targets, full-screen steps)

# Phase 14: Payments — Implementation Plan

## Codebase audit

**Existing relevant fields in `organisations` table (migration 001):**
- `stripe_customer_id text null` — already present
- `subscription_tier text DEFAULT 'free'` — existing field, replaced in role by new `subscription_status`

**No products/new page exists** — must be created from scratch.
**No billing pages exist** — must be created.
**AppShell is `"use client"`** — has no data access. Trial banner will be a self-contained client component that fetches `/api/billing/trial-status` on mount, inserted directly into AppShell's `<main>` before `{children}`. This avoids touching every protected page.

---

## 1. Migration — `supabase/migrations/014_billing.sql`

```sql
ALTER TABLE organisations
  ADD COLUMN stripe_subscription_id text,
  ADD COLUMN trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  ADD COLUMN subscription_status text DEFAULT 'trial',
  ADD COLUMN plan text DEFAULT 'trial',
  ADD COLUMN sku_limit integer DEFAULT 2;
```

`stripe_customer_id` already exists from migration 001 — not re-added.
Column defaults ensure every existing and future org row starts on trial.

---

## 2. Types — `types/database.ts`

Extend `Organisation` interface with 5 new fields:
```typescript
stripe_subscription_id: string | null;
trial_ends_at:          string | null;   // ISO timestamptz
subscription_status:    string;          // 'trial' | 'active' | 'cancelled' | 'past_due'
plan:                   string;          // 'trial' | 'pro'
sku_limit:              number;
```

---

## 3. `lib/billing/checkAccess.ts` — NEW

```typescript
export interface AccessResult {
  allowed: boolean;
  reason:  'ok' | 'trial_expired' | 'trial_limit' | 'plan_limit' | 'subscription_inactive';
}

export async function canCreateProduct(
  db: AnyClient,
  organisationId: string,
): Promise<AccessResult>
```

Logic (exactly as spec):
- `subscription_status === 'trial'`:
  - `trial_ends_at < now()` → `{ allowed: false, reason: 'trial_expired' }`
  - count active products >= `sku_limit` → `{ allowed: false, reason: 'trial_limit' }`
  - else → `{ allowed: true, reason: 'ok' }`
- `subscription_status === 'active'`:
  - count >= `sku_limit` → `{ allowed: false, reason: 'plan_limit' }`
  - else → `{ allowed: true, reason: 'ok' }`
- `'cancelled' | 'past_due'` → `{ allowed: false, reason: 'subscription_inactive' }`

---

## 4. `components/ui/UpgradePrompt.tsx` — NEW

Props: `reason: string`

| reason | Heading | Body | Button |
|--------|---------|------|--------|
| `trial_expired` | Your 14-day free trial has ended. | Subscribe for €99/month to continue building. | Subscribe Now |
| `trial_limit` | You have reached the 2-product limit on the free trial. | Subscribe for €99/month to add up to 20 products. | Upgrade to Pro |
| `plan_limit` | You have reached your 20-product limit. | Contact us to discuss higher limits. | Contact Us |
| `subscription_inactive` | Your subscription is inactive. | Subscribe to continue adding products. | Subscribe Now |

"Subscribe Now" and "Upgrade to Pro" buttons: POST `/api/stripe/create-checkout` → redirect to returned URL.
"Contact Us" button: `mailto:` link.

---

## 5. API Routes

### `app/api/billing/trial-status/route.ts` — NEW
GET — returns `{ subscriptionStatus, trialEndsAt, daysLeft: number | null }` for current user's org.
Used by the trial banner client component. If `daysLeft <= 7` and status is `'trial'`, the banner shows.

### `app/api/stripe/create-checkout/route.ts` — NEW
POST — creates Stripe Checkout Session:
1. Get org from auth user's profile
2. If `stripe_customer_id` is null: create Stripe customer (`stripe.customers.create`), save to org
3. Create checkout session: `mode: 'subscription'`, `price: PRICE_ID`, `success_url`, `cancel_url`, `customer`
4. Return `{ url: session.url }`

### `app/api/stripe/webhook/route.ts` — NEW
POST — raw body read for signature verification:
```typescript
export const dynamic = 'force-dynamic';
const rawBody = await req.text();
stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
```

Events handled:
- `customer.subscription.created` → set `subscription_status='active'`, `stripe_subscription_id`, `plan='pro'`, `sku_limit=20`, audit_log
- `customer.subscription.deleted` → set `subscription_status='cancelled'`, `sku_limit=0`, audit_log
- `invoice.payment_failed` → set `subscription_status='past_due'`, send email via Resend

### `app/api/stripe/portal/route.ts` — NEW
POST — creates Stripe Customer Portal session, returns `{ url }`.
Client redirects to the portal URL.

---

## 6. Pages

### `app/(protected)/billing/success/page.tsx` — NEW
Server component. Shows "You are now subscribed. Welcome to FoodComply Pro." with a "Go to dashboard" button.
Does **not** update `sku_limit` here — the webhook event is the authoritative source.
(Note: Stripe webhooks fire asynchronously; the success page is just UI confirmation.)

### `app/(protected)/billing/cancel/page.tsx` — NEW
Minimal page: "Subscription cancelled — you can subscribe any time." + "Back to settings" link.

### `app/(protected)/products/new/page.tsx` — NEW
Server component:
1. Fetch user's org (with new billing fields)
2. Call `canCreateProduct(db, orgId)`
3. If `!allowed`: render `<UpgradePrompt reason={reason} />` wrapped in AppShell
4. If `allowed`: render the new product form wrapped in AppShell

The product creation form: name, category (select), target markets (multi), SKU (optional) → POST `/api/products` → redirect to `/products/[new-id]`.

### `app/api/products/route.ts` — NEW
POST — creates product + auto-generates default checklist items for the org. Returns `{ product }`.

---

## 7. Trial Banner

### `components/ui/TrialBanner.tsx` — NEW
`"use client"` component:
- `useEffect` on mount: fetch `/api/billing/trial-status`
- If `daysLeft === null` or `daysLeft > 7` or `status !== 'trial'`: renders nothing
- If `daysLeft <= 7`: shows amber banner with dismiss (`useState`)

```
┌──────────────────────────────────────────────────────────────┐
│ Your free trial ends in 3 days. Subscribe to keep access.    │
│                                        [Subscribe] [×]       │
└──────────────────────────────────────────────────────────────┘
```

### `components/layout/AppShell.tsx` — MODIFIED
Add `<TrialBanner />` at the top of `<main>` before `{children}`. No prop changes needed — banner is self-contained.

---

## 8. Settings Page — MODIFIED

`app/(protected)/settings/page.tsx`: Add a "Billing" section with a "Manage Billing" row that POSTs to `/api/stripe/portal` and redirects.

Since settings is a server component (can't easily do a fetch-and-redirect), add a small `BillingPortalButton` client component that POSTs on click and redirects to the portal URL.

---

## 9. `.env.local` additions

Document in plan (not committed):
```
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_ID=price_xxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=re_xxxxx
```

---

## 10. File Changelist

| File | Action |
|------|--------|
| `supabase/migrations/014_billing.sql` | **NEW** |
| `types/database.ts` | **MODIFIED** — extend Organisation |
| `lib/billing/checkAccess.ts` | **NEW** |
| `components/ui/UpgradePrompt.tsx` | **NEW** |
| `components/ui/TrialBanner.tsx` | **NEW** |
| `components/layout/AppShell.tsx` | **MODIFIED** — add TrialBanner |
| `app/api/billing/trial-status/route.ts` | **NEW** |
| `app/api/stripe/create-checkout/route.ts` | **NEW** |
| `app/api/stripe/webhook/route.ts` | **NEW** |
| `app/api/stripe/portal/route.ts` | **NEW** |
| `app/api/products/route.ts` | **NEW** — POST creates product |
| `app/(protected)/billing/success/page.tsx` | **NEW** |
| `app/(protected)/billing/cancel/page.tsx` | **NEW** |
| `app/(protected)/products/new/page.tsx` | **NEW** |
| `app/(protected)/settings/page.tsx` | **MODIFIED** — billing row + portal button |

Total: 12 new files, 3 modified files.

---

## 11. Notes

- **Trial banner approach**: Self-contained client component in AppShell — no changes to existing protected pages.
- **Webhook authority**: `customer.subscription.created` is authoritative for setting `sku_limit=20`, not the success page.
- **stripe_customer_id**: Already in migration 001. Migration 014 adds the 5 new fields only.
- **Resend**: Simple single call in the webhook handler; no Resend SDK import needed (plain fetch to the Resend API).
- **Product creation gate**: Only on `/products/new`; existing products are unaffected.

---

## 12. Definition of Done Checklist

- [ ] New signup gets 14-day trial with 2 product limit (migration defaults)
- [ ] canCreateProduct enforces trial/active/cancelled/past_due logic
- [ ] Trial limit shows UpgradePrompt when 2 products created
- [ ] Trial expiry shows UpgradePrompt after 14 days
- [ ] Stripe Checkout completes, webhook sets active + sku_limit=20
- [ ] Payment failure sets status to past_due
- [ ] Billing portal accessible from Settings
- [ ] Trial countdown banner in last 7 days (self-contained, all pages)
- [ ] All billing events in audit log

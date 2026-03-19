/**
 * Core TypeScript interfaces for every database table.
 * These mirror the Supabase schema defined in supabase/migrations/.
 * Extend these interfaces as new columns / tables are introduced.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type ProductStatus = "draft" | "in_review" | "approved" | "archived";

export type DocumentType =
  | "spec_sheet"
  | "lab_report"
  | "certificate"
  | "declaration"
  | "other";

export type ChecklistCategory =
  | "formula"
  | "compliance"
  | "documents"
  | "packaging"
  | "suppliers";

// ─── Score types ──────────────────────────────────────────────────────────────
// Exported here so they can be used in API responses and the product record page.

export interface ScoreCategoryBreakdown {
  completed:  number;
  total:      number;
  percentage: number;
}

export interface ScoreBreakdown {
  formula:    ScoreCategoryBreakdown;
  compliance: ScoreCategoryBreakdown;
  documents:  ScoreCategoryBreakdown;
  packaging:  ScoreCategoryBreakdown;
  suppliers:  ScoreCategoryBreakdown;
}

export interface ScoreResult {
  total:              number;              // 0–100 integer
  breakdown:          ScoreBreakdown;
  blockingIncomplete: string[];            // titles of blocking items not yet done
  milestoneMessage:   string;
}

// ─── Organisation ─────────────────────────────────────────────────────────────

export interface Organisation {
  id:                string;
  name:              string;
  slug:              string;
  country_code:      string;              // ISO 3166-1 alpha-2, e.g. "DE"
  subscription_tier: "free" | "starter" | "pro" | "enterprise";
  stripe_customer_id: string | null;
  created_at:        string;
  updated_at:        string;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface Profile {
  id:                  string;            // matches auth.users.id
  organisation_id:     string;
  full_name:           string;
  email:               string;
  role:                "owner" | "admin" | "member" | "viewer";
  avatar_url:          string | null;
  onboarding_complete: boolean;
  created_at:          string;
  updated_at:          string;
}

// ─── Product ──────────────────────────────────────────────────────────────────

export interface Product {
  id:                  string;
  organisation_id:     string;
  name:                string;
  sku:                 string | null;
  category:            string | null;     // e.g. "dairy", "bakery", "beverage"
  status:              ProductStatus;
  readiness_score:     number;            // 0–100
  readiness_breakdown: ScoreBreakdown | null;
  target_markets:      string[];          // ISO country codes, e.g. ["DE","FR","NL"]
  created_by:          string;            // profile id
  created_at:          string;
  updated_at:          string;
}

// ─── Formula ──────────────────────────────────────────────────────────────────

export interface Formula {
  id:              string;
  product_id:      string;
  organisation_id: string;
  version:         number;
  is_active:       boolean;
  is_locked:       boolean;               // true → auto-trigger product spec generation
  net_weight_g:    number | null;
  serving_size_g:  number | null;
  // Nutritional values per 100 g
  energy_kcal:     number | null;
  fat_g:           number | null;
  saturated_fat_g: number | null;
  carbohydrate_g:  number | null;
  sugars_g:        number | null;
  fibre_g:         number | null;
  protein_g:       number | null;
  salt_g:          number | null;
  // Allergen / storage metadata
  may_contain_allergens: string[];        // cross-contamination allergen codes
  storage_conditions:    string | null;   // e.g. "Store in a cool, dry place"
  shelf_life_days:       number | null;   // days from production
  created_by:      string;
  created_at:      string;
  updated_at:      string;
}

// ─── Ingredient ───────────────────────────────────────────────────────────────

export interface Ingredient {
  id:             string;
  formula_id:     string;
  organisation_id: string;
  name:           string;
  percentage:     number;                 // 0–100, must sum to 100 within formula
  supplier_id:    string | null;
  is_allergen:    boolean;
  allergen_codes: string[];               // EU allergen codes, e.g. ["GLUTEN","MILK"]
  e_numbers:      string[];               // e.g. ["E100","E211"]
  is_organic:     boolean;
  origin_country: string | null;          // ISO country code
  sort_order:     number;
  // Phase 7 additions
  coa_document_id: string | null;         // FK to documents (Certificate of Analysis)
  review_due_at:   string | null;         // ISO date for periodic ingredient review
  created_at:     string;
  updated_at:     string;
}

// ─── Supplier ─────────────────────────────────────────────────────────────────

export type RiskRating = "low" | "medium" | "high";

export interface Supplier {
  id:               string;
  organisation_id:  string;
  name:             string;
  country:          string | null;        // free-text country name
  contact_email:    string | null;
  certifications:   string[];             // e.g. ["BRC","IFS","ORGANIC"]
  notes:            string | null;
  // Approval workflow
  approved:         boolean;
  approval_date:    string | null;        // ISO timestamp
  review_date:      string | null;        // ISO date
  risk_rating:      RiskRating;
  created_at:       string;
  updated_at:       string;
}

// ─── SupplyChainEvent ─────────────────────────────────────────────────────────

export interface SupplyChainEvent {
  id:                      string;
  organisation_id:         string;
  event_type:              string;        // e.g. 'supplier_revoked'
  affected_supplier_id:    string | null;
  affected_ingredient_ids: string[];
  affected_product_ids:    string[];
  cascade_items_reset:     number;
  description:             string | null;
  created_at:              string;
  resolved_at:             string | null;
}

// ─── Document ─────────────────────────────────────────────────────────────────

export interface Document {
  id:              string;
  product_id:      string;
  organisation_id: string;
  name:            string;
  type:            DocumentType;
  storage_path:    string;                // Supabase Storage object path
  mime_type:       string;
  size_bytes:      number;
  expiry_date:     string | null;         // ISO date — certificate expiry alerts
  uploaded_by:     string;               // profile id
  created_at:      string;
  updated_at:      string;
}

// ─── ChecklistItem ────────────────────────────────────────────────────────────

export interface ChecklistItem {
  id:                     string;
  product_id:             string;
  organisation_id:        string;

  // Categorisation
  category:               ChecklistCategory;
  sort_order:             number;

  // Content
  title:                  string;
  help_text:              string | null;
  weight:                 number;         // used in score formula

  // Completion
  blocking:               boolean;        // cannot reach "approved" without this
  completed:              boolean;
  completed_at:           string | null;
  completed_by:           string | null;  // email of completing user

  // Inline regulation reference (all nullable)
  regulation_code:        string | null;  // e.g. "EU 1169/2011"
  regulation_article:     string | null;  // e.g. "Article 9(1)(c)"
  regulation_explanation: string | null;
  regulation_url:         string | null;  // EUR-Lex link

  // Optional evidence document (FK wired up in Phase 5)
  evidence_document_id:   string | null;

  created_at:             string;
  updated_at:             string;
}

// ─── AuditLog ─────────────────────────────────────────────────────────────────

export interface AuditLog {
  id:              string;
  organisation_id: string;
  product_id:      string | null;        // null for org-level events
  actor_id:        string | null;        // profile id (null if user deleted)
  actor_email:     string;               // preserved even after profile deletion
  action_type:     string;               // e.g. 'checklist_item_completed'
  description:     string;               // human-readable sentence
  resource_type:   string | null;        // e.g. 'checklist_item', 'product'
  resource_id:     string | null;
  metadata:        Record<string, unknown> | null;
  created_at:      string;               // immutable
}

// ─── Regulation ───────────────────────────────────────────────────────────────
// Reference table of EU food regulations (used when generating checklist items).

export interface Regulation {
  id:                    string;
  code:                  string;          // e.g. "EU 1169/2011"
  short_name:            string;          // e.g. "Food Information to Consumers"
  article:               string | null;   // e.g. "Article 9"
  plain_english:         string;
  eur_lex_url:           string;
  applies_to_categories: string[];
  created_at:            string;
  updated_at:            string;
}

// ─── Database helper type ─────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      organisations: {
        Row:    Organisation;
        Insert: Omit<Organisation, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Organisation, "id" | "created_at">>;
      };
      profiles: {
        Row:    Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      products: {
        Row:    Product;
        Insert: Omit<Product, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Product, "id" | "created_at">>;
      };
      formulas: {
        Row:    Formula;
        Insert: Omit<Formula, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Formula, "id" | "created_at">>;
      };
      ingredients: {
        Row:    Ingredient;
        Insert: Omit<Ingredient, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Ingredient, "id" | "created_at">>;
      };
      suppliers: {
        Row:    Supplier;
        Insert: Omit<Supplier, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Supplier, "id" | "created_at">>;
      };
      supply_chain_events: {
        Row:    SupplyChainEvent;
        Insert: Omit<SupplyChainEvent, "id" | "created_at">;
        Update: Pick<SupplyChainEvent, "resolved_at">;  // only resolvable
      };
      documents: {
        Row:    Document;
        Insert: Omit<Document, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Document, "id" | "created_at">>;
      };
      checklist_items: {
        Row:    ChecklistItem;
        Insert: Omit<ChecklistItem, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ChecklistItem, "id" | "created_at">>;
      };
      regulations: {
        Row:    Regulation;
        Insert: Omit<Regulation, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Regulation, "id" | "created_at">>;
      };
      audit_log: {
        Row:    AuditLog;
        Insert: Omit<AuditLog, "id" | "created_at">;
        Update: Record<string, never>;    // audit log is immutable — no valid update keys
      };
    };
    Views:     Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      product_status:     ProductStatus;
      document_type:      DocumentType;
      checklist_category: ChecklistCategory;
    };
  };
}

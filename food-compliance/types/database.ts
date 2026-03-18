/**
 * Core TypeScript interfaces for every database table.
 * These mirror the Supabase schema — we will add SQL migrations in later phases.
 * Extend these interfaces as new columns / tables are introduced.
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

export type ProductStatus = "draft" | "in_review" | "approved" | "archived";

export type DocumentType =
  | "spec_sheet"
  | "lab_report"
  | "certificate"
  | "declaration"
  | "other";

export type ChecklistItemStatus = "pending" | "complete" | "not_applicable";

export type AuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "submitted"
  | "approved"
  | "archived";

// ─── Organisation ─────────────────────────────────────────────────────────────
// Every user belongs to one Organisation (multi-tenant isolation).

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  country_code: string; // ISO 3166-1 alpha-2, e.g. "DE"
  subscription_tier: "free" | "starter" | "pro" | "enterprise";
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Profile ──────────────────────────────────────────────────────────────────
// One profile per Supabase auth user; links to an organisation.

export interface Profile {
  id: string; // matches auth.users.id
  organisation_id: string;
  full_name: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  avatar_url: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Product ──────────────────────────────────────────────────────────────────
// A finished food/beverage product manufactured by the organisation.

export interface Product {
  id: string;
  organisation_id: string;
  name: string;
  sku: string | null;
  category: string | null; // e.g. "dairy", "bakery", "beverage"
  status: ProductStatus;
  compliance_score: number | null; // 0-100
  target_markets: string[]; // ISO country codes, e.g. ["DE","FR","NL"]
  created_by: string; // profile id
  created_at: string;
  updated_at: string;
}

// ─── Formula ──────────────────────────────────────────────────────────────────
// The recipe / formulation attached to a product (one active formula per product).

export interface Formula {
  id: string;
  product_id: string;
  organisation_id: string;
  version: number;
  is_active: boolean;
  net_weight_g: number | null;
  serving_size_g: number | null;
  // Nutritional values per 100 g
  energy_kcal: number | null;
  fat_g: number | null;
  saturated_fat_g: number | null;
  carbohydrate_g: number | null;
  sugars_g: number | null;
  fibre_g: number | null;
  protein_g: number | null;
  salt_g: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Ingredient ───────────────────────────────────────────────────────────────
// One row per ingredient line in a formula.

export interface Ingredient {
  id: string;
  formula_id: string;
  organisation_id: string;
  name: string;
  percentage: number; // 0-100, must sum to 100 within a formula
  supplier_id: string | null;
  is_allergen: boolean;
  allergen_codes: string[]; // EU allergen codes, e.g. ["GLUTEN","MILK"]
  e_numbers: string[]; // e.g. ["E100","E211"]
  is_organic: boolean;
  origin_country: string | null; // ISO country code
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Supplier ─────────────────────────────────────────────────────────────────
// Ingredient suppliers — used for traceability.

export interface Supplier {
  id: string;
  organisation_id: string;
  name: string;
  country_code: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  certification_codes: string[]; // e.g. ["BRC","IFS","ORGANIC"]
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Document ─────────────────────────────────────────────────────────────────
// Files attached to products (spec sheets, lab reports, certificates, etc.).

export interface Document {
  id: string;
  product_id: string;
  organisation_id: string;
  name: string;
  type: DocumentType;
  storage_path: string; // Supabase Storage object path
  mime_type: string;
  size_bytes: number;
  expiry_date: string | null; // ISO date — used for certificate expiry alerts
  uploaded_by: string; // profile id
  created_at: string;
  updated_at: string;
}

// ─── ChecklistItem ────────────────────────────────────────────────────────────
// Auto-generated compliance checklist items for a product.

export interface ChecklistItem {
  id: string;
  product_id: string;
  organisation_id: string;
  regulation_id: string | null;
  title: string;
  description: string | null;
  status: ChecklistItemStatus;
  is_blocking: boolean; // if true, product cannot reach "approved" without this
  evidence_document_id: string | null;
  completed_by: string | null; // profile id
  completed_at: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Regulation ───────────────────────────────────────────────────────────────
// Reference table of EU food regulations shown in ComplianceAnchor tags.

export interface Regulation {
  id: string;
  code: string; // e.g. "EU 1169/2011"
  short_name: string; // e.g. "Food Information to Consumers"
  article: string | null; // e.g. "Article 9"
  plain_english: string; // short plain-English summary
  eur_lex_url: string; // direct link to EUR-Lex
  applies_to_categories: string[]; // product category codes it applies to
  created_at: string;
  updated_at: string;
}

// ─── AuditLog ─────────────────────────────────────────────────────────────────
// Immutable record of every significant action for traceability.

export interface AuditLog {
  id: string;
  organisation_id: string;
  actor_id: string; // profile id
  action: AuditAction;
  resource_type: string; // e.g. "product", "formula", "document"
  resource_id: string;
  metadata: Record<string, unknown> | null; // any extra context
  ip_address: string | null;
  created_at: string;
}

// ─── Database helper type ─────────────────────────────────────────────────────
// Passed as a generic to the Supabase client for full type-safety.
// Expand this as you add tables.

export interface Database {
  public: {
    Tables: {
      organisations: {
        Row: Organisation;
        Insert: Omit<Organisation, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Organisation, "id" | "created_at">>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      products: {
        Row: Product;
        Insert: Omit<Product, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Product, "id" | "created_at">>;
      };
      formulas: {
        Row: Formula;
        Insert: Omit<Formula, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Formula, "id" | "created_at">>;
      };
      ingredients: {
        Row: Ingredient;
        Insert: Omit<Ingredient, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Ingredient, "id" | "created_at">>;
      };
      suppliers: {
        Row: Supplier;
        Insert: Omit<Supplier, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Supplier, "id" | "created_at">>;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Document, "id" | "created_at">>;
      };
      checklist_items: {
        Row: ChecklistItem;
        Insert: Omit<ChecklistItem, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ChecklistItem, "id" | "created_at">>;
      };
      regulations: {
        Row: Regulation;
        Insert: Omit<Regulation, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Regulation, "id" | "created_at">>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, "id" | "created_at">;
        Update: never; // audit logs are immutable
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      product_status: ProductStatus;
      document_type: DocumentType;
      checklist_item_status: ChecklistItemStatus;
      audit_action: AuditAction;
    };
  };
}

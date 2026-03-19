-- ─── Phase 6: Formulas & Ingredients ─────────────────────────────────────────
-- Creates the formulas and ingredients tables that are typed in database.ts
-- but were not yet migrated.  Also adds the extra columns needed for document
-- template generation: is_locked, may_contain_allergens, storage_conditions,
-- and shelf_life_days.

-- ─── formulas ─────────────────────────────────────────────────────────────────

CREATE TABLE formulas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       uuid NOT NULL REFERENCES products(id)       ON DELETE CASCADE,
  organisation_id  uuid NOT NULL REFERENCES organisations(id)  ON DELETE CASCADE,

  version          integer    NOT NULL DEFAULT 1,
  is_active        boolean    NOT NULL DEFAULT true,
  is_locked        boolean    NOT NULL DEFAULT false,  -- set to true to auto-trigger product spec

  -- Serving & weight
  net_weight_g     numeric(10,3),
  serving_size_g   numeric(10,3),

  -- Nutritional values per 100 g (EU 1169/2011 mandatory set)
  energy_kcal      numeric(8,2),
  fat_g            numeric(8,3),
  saturated_fat_g  numeric(8,3),
  carbohydrate_g   numeric(8,3),
  sugars_g         numeric(8,3),
  fibre_g          numeric(8,3),
  protein_g        numeric(8,3),
  salt_g           numeric(8,3),

  -- Allergen / storage metadata (used in template generation)
  may_contain_allergens  text[]  NOT NULL DEFAULT '{}',  -- cross-contamination codes
  storage_conditions     text,                            -- e.g. "Store in a cool, dry place"
  shelf_life_days        integer,                         -- days from production

  created_by  uuid NOT NULL REFERENCES profiles(id)  ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE formulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "formulas: org members can select"
  ON formulas FOR SELECT
  USING (organisation_id IN (
    SELECT organisation_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "formulas: org members can insert"
  ON formulas FOR INSERT
  WITH CHECK (organisation_id IN (
    SELECT organisation_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "formulas: org members can update"
  ON formulas FOR UPDATE
  USING (organisation_id IN (
    SELECT organisation_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "formulas: org members can delete"
  ON formulas FOR DELETE
  USING (organisation_id IN (
    SELECT organisation_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_formulas_product ON formulas(product_id);

CREATE TRIGGER set_formulas_updated_at
  BEFORE UPDATE ON formulas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── ingredients ──────────────────────────────────────────────────────────────

CREATE TABLE ingredients (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formula_id       uuid NOT NULL REFERENCES formulas(id)       ON DELETE CASCADE,
  organisation_id  uuid NOT NULL REFERENCES organisations(id)  ON DELETE CASCADE,

  name            text    NOT NULL,
  percentage      numeric(6,3) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  supplier_id     uuid,  -- FK to suppliers added in 008_alter_ingredients after suppliers table created

  is_allergen     boolean  NOT NULL DEFAULT false,
  allergen_codes  text[]   NOT NULL DEFAULT '{}',  -- EU allergen codes, e.g. ["GLUTEN","MILK"]
  e_numbers       text[]   NOT NULL DEFAULT '{}',  -- e.g. ["E100","E211"]
  is_organic      boolean  NOT NULL DEFAULT false,
  origin_country  char(2),                          -- ISO 3166-1 alpha-2

  sort_order      integer  NOT NULL DEFAULT 0,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingredients: org members can select"
  ON ingredients FOR SELECT
  USING (organisation_id IN (
    SELECT organisation_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "ingredients: org members can insert"
  ON ingredients FOR INSERT
  WITH CHECK (organisation_id IN (
    SELECT organisation_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "ingredients: org members can update"
  ON ingredients FOR UPDATE
  USING (organisation_id IN (
    SELECT organisation_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "ingredients: org members can delete"
  ON ingredients FOR DELETE
  USING (organisation_id IN (
    SELECT organisation_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_ingredients_formula ON ingredients(formula_id);

CREATE TRIGGER set_ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

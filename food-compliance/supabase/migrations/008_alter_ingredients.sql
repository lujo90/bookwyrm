-- ─── Phase 7: Extend ingredients table ───────────────────────────────────────
-- Adds the supplier FK constraint (suppliers table now exists), a COA document
-- link, and a review due date to support the Phase 7 ingredient library.

-- Wire up the supplier FK now that suppliers table exists
ALTER TABLE ingredients
  ADD CONSTRAINT fk_ingredients_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

-- COA (Certificate of Analysis) document link
ALTER TABLE ingredients
  ADD COLUMN coa_document_id  uuid REFERENCES documents(id) ON DELETE SET NULL;

-- Periodic review date for this ingredient
ALTER TABLE ingredients
  ADD COLUMN review_due_at  date;

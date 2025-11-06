-- Add display_order column to categories table
ALTER TABLE categories ADD COLUMN display_order INTEGER DEFAULT 0;

-- Set initial display_order based on creation order
UPDATE categories SET display_order = (
  SELECT COUNT(*) FROM categories c2 
  WHERE c2.created_at < categories.created_at 
  AND c2.tenant_id = categories.tenant_id
);
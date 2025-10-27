-- Add potential_to_sign column to projects table
ALTER TABLE projects ADD COLUMN potential_to_sign numeric DEFAULT 0 CHECK (potential_to_sign >= 0 AND potential_to_sign <= 100);
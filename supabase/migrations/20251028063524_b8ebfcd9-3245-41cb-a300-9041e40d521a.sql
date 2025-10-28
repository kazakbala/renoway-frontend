-- Make calculation_base nullable in works table
ALTER TABLE public.works 
ALTER COLUMN calculation_base DROP NOT NULL,
ALTER COLUMN calculation_base DROP DEFAULT;
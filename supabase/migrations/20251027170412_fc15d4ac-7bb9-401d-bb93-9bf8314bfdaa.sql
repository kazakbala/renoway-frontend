-- Add calculation_base column to works table
ALTER TABLE public.works 
ADD COLUMN calculation_base text NOT NULL DEFAULT 'wall';

-- Add constraint to ensure only valid values
ALTER TABLE public.works
ADD CONSTRAINT works_calculation_base_check 
CHECK (calculation_base IN ('wall', 'floor', 'perimeter'));
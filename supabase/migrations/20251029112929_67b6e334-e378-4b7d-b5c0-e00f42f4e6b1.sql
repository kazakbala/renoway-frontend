-- Add price multiplier and discount fields to projects table
ALTER TABLE public.projects
ADD COLUMN price_multiplier numeric DEFAULT 1,
ADD COLUMN discount numeric DEFAULT 0,
ADD COLUMN discount_type text DEFAULT 'amount' CHECK (discount_type IN ('amount', 'percentage'));
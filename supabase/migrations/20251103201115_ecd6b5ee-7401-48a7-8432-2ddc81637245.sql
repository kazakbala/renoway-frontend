-- Add custom_price_per_unit column to project_room_works table
ALTER TABLE public.project_room_works
ADD COLUMN custom_price_per_unit numeric;
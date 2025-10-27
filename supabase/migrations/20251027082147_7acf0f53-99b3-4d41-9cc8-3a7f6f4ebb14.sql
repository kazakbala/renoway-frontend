-- Add full_name column to clients table
ALTER TABLE public.clients
ADD COLUMN full_name TEXT;
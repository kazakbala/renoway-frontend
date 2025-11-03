-- Add company_details and bank_details fields to tenants table
ALTER TABLE public.tenants 
ADD COLUMN company_details TEXT,
ADD COLUMN bank_details TEXT;
-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true);

-- Add logo_url column to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage policies for company logos
CREATE POLICY "Users can view company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

CREATE POLICY "Users can upload their company logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' 
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their company logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete their company logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE user_id = auth.uid())
);
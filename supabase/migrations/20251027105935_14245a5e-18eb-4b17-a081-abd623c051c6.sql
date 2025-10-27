-- Add progress tracking fields to project_works
ALTER TABLE public.project_works 
ADD COLUMN progress numeric DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
ADD COLUMN start_date date,
ADD COLUMN end_date date;

-- Add share token to projects for public links
ALTER TABLE public.projects
ADD COLUMN share_token text UNIQUE;

-- Create function to generate share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- RLS policy for public project access via share token
CREATE POLICY "Public can view shared projects"
ON public.projects
FOR SELECT
USING (share_token IS NOT NULL);

-- RLS policy for public project_blocks access
CREATE POLICY "Public can view blocks of shared projects"
ON public.project_blocks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_blocks.project_id
    AND projects.share_token IS NOT NULL
  )
);

-- RLS policy for public project_works access
CREATE POLICY "Public can view works of shared projects"
ON public.project_works
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    JOIN public.project_blocks ON projects.id = project_blocks.project_id
    WHERE project_blocks.id = project_works.project_block_id
    AND projects.share_token IS NOT NULL
  )
);
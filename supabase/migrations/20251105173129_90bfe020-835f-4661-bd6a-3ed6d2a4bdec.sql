-- Add order column to works table
ALTER TABLE public.works 
ADD COLUMN display_order integer DEFAULT 0;

-- Update existing works to have sequential order within their categories
WITH ordered_works AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY created_at) as row_num
  FROM public.works
)
UPDATE public.works w
SET display_order = ow.row_num
FROM ordered_works ow
WHERE w.id = ow.id;

-- Create index for better performance
CREATE INDEX idx_works_display_order ON public.works(category_id, display_order);
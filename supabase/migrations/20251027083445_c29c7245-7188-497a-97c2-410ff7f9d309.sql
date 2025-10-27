-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice_items table (links to project_works)
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  project_work_id UUID NOT NULL REFERENCES public.project_works(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 1,
  price_per_unit NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoices
CREATE POLICY "Authenticated users can view invoices"
ON public.invoices FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert invoices"
ON public.invoices FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoices"
ON public.invoices FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete invoices"
ON public.invoices FOR DELETE
TO authenticated
USING (true);

-- RLS policies for invoice_items
CREATE POLICY "Authenticated users can view invoice_items"
ON public.invoice_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert invoice_items"
ON public.invoice_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoice_items"
ON public.invoice_items FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete invoice_items"
ON public.invoice_items FOR DELETE
TO authenticated
USING (true);

-- Add updated_at trigger for invoices
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
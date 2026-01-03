-- Create enum for meeting type
CREATE TYPE public.meeting_type AS ENUM ('online', 'offline');

-- Create meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  assigned_to UUID NOT NULL REFERENCES public.profiles(id),
  type public.meeting_type NOT NULL DEFAULT 'offline',
  location TEXT,
  location_link TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id)
);

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view meetings in their tenant"
ON public.meetings
FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert meetings in their tenant"
ON public.meetings
FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update meetings in their tenant"
ON public.meetings
FOR UPDATE
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete meetings in their tenant"
ON public.meetings
FOR DELETE
USING (tenant_id = get_user_tenant_id());

-- Trigger to auto-set tenant_id
CREATE TRIGGER set_meetings_tenant_id
  BEFORE INSERT ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- Trigger for updated_at
CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
-- Create materials table
CREATE TABLE public.materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  unit_type TEXT NOT NULL,
  price_per_unit NUMERIC NOT NULL,
  tenant_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Create policies for materials
CREATE POLICY "Users can view materials in their tenant" 
ON public.materials 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert materials in their tenant" 
ON public.materials 
FOR INSERT 
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update materials in their tenant" 
ON public.materials 
FOR UPDATE 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete materials in their tenant" 
ON public.materials 
FOR DELETE 
USING (tenant_id = get_user_tenant_id());

-- Create trigger to automatically set tenant_id
CREATE TRIGGER set_materials_tenant_id
  BEFORE INSERT ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- Create project_materials table
CREATE TABLE public.project_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  material_id UUID NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  tenant_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.project_materials ENABLE ROW LEVEL SECURITY;

-- Create policies for project_materials
CREATE POLICY "Users can view project materials in their tenant" 
ON public.project_materials 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert project materials in their tenant" 
ON public.project_materials 
FOR INSERT 
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update project materials in their tenant" 
ON public.project_materials 
FOR UPDATE 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete project materials in their tenant" 
ON public.project_materials 
FOR DELETE 
USING (tenant_id = get_user_tenant_id());

-- Create trigger to automatically set tenant_id
CREATE TRIGGER set_project_materials_tenant_id
  BEFORE INSERT ON public.project_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();
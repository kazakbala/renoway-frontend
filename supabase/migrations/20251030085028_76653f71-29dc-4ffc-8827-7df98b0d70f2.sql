-- Create tenants table
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Add tenant_id to profiles
ALTER TABLE public.profiles ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_profiles_tenant_id ON public.profiles(tenant_id);

-- Create security definer function to get current user's tenant
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- Add tenant_id to all data tables
ALTER TABLE public.clients ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.works ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.room_types ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.project_rooms ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.project_room_works ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.work_room_types ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Create indexes for faster lookups
CREATE INDEX idx_clients_tenant_id ON public.clients(tenant_id);
CREATE INDEX idx_categories_tenant_id ON public.categories(tenant_id);
CREATE INDEX idx_works_tenant_id ON public.works(tenant_id);
CREATE INDEX idx_projects_tenant_id ON public.projects(tenant_id);
CREATE INDEX idx_room_types_tenant_id ON public.room_types(tenant_id);
CREATE INDEX idx_project_rooms_tenant_id ON public.project_rooms(tenant_id);
CREATE INDEX idx_project_room_works_tenant_id ON public.project_room_works(tenant_id);
CREATE INDEX idx_work_room_types_tenant_id ON public.work_room_types(tenant_id);

-- Update RLS policies for tenants table
CREATE POLICY "Users can view their own tenant"
ON public.tenants FOR SELECT
USING (id = public.get_user_tenant_id());

-- Update RLS policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view profiles in their tenant"
ON public.profiles FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update profiles in their tenant"
ON public.profiles FOR UPDATE
USING (tenant_id = public.get_user_tenant_id());

-- Update RLS policies for clients
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;

CREATE POLICY "Users can view clients in their tenant"
ON public.clients FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert clients in their tenant"
ON public.clients FOR INSERT
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update clients in their tenant"
ON public.clients FOR UPDATE
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete clients in their tenant"
ON public.clients FOR DELETE
USING (tenant_id = public.get_user_tenant_id());

-- Update RLS policies for categories
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.categories;

CREATE POLICY "Users can view categories in their tenant"
ON public.categories FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert categories in their tenant"
ON public.categories FOR INSERT
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update categories in their tenant"
ON public.categories FOR UPDATE
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete categories in their tenant"
ON public.categories FOR DELETE
USING (tenant_id = public.get_user_tenant_id());

-- Update RLS policies for works
DROP POLICY IF EXISTS "Authenticated users can view works" ON public.works;
DROP POLICY IF EXISTS "Authenticated users can insert works" ON public.works;
DROP POLICY IF EXISTS "Authenticated users can update works" ON public.works;
DROP POLICY IF EXISTS "Authenticated users can delete works" ON public.works;

CREATE POLICY "Users can view works in their tenant"
ON public.works FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert works in their tenant"
ON public.works FOR INSERT
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update works in their tenant"
ON public.works FOR UPDATE
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete works in their tenant"
ON public.works FOR DELETE
USING (tenant_id = public.get_user_tenant_id());

-- Update RLS policies for projects
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;

CREATE POLICY "Users can view projects in their tenant"
ON public.projects FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert projects in their tenant"
ON public.projects FOR INSERT
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update projects in their tenant"
ON public.projects FOR UPDATE
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete projects in their tenant"
ON public.projects FOR DELETE
USING (tenant_id = public.get_user_tenant_id());

-- Update RLS policies for room_types
DROP POLICY IF EXISTS "Authenticated users can view room types" ON public.room_types;
DROP POLICY IF EXISTS "Authenticated users can insert room types" ON public.room_types;
DROP POLICY IF EXISTS "Authenticated users can update room types" ON public.room_types;
DROP POLICY IF EXISTS "Authenticated users can delete room types" ON public.room_types;

CREATE POLICY "Users can view room types in their tenant"
ON public.room_types FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert room types in their tenant"
ON public.room_types FOR INSERT
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update room types in their tenant"
ON public.room_types FOR UPDATE
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete room types in their tenant"
ON public.room_types FOR DELETE
USING (tenant_id = public.get_user_tenant_id());

-- Update RLS policies for project_rooms
DROP POLICY IF EXISTS "Authenticated users can view project rooms" ON public.project_rooms;
DROP POLICY IF EXISTS "Authenticated users can insert project rooms" ON public.project_rooms;
DROP POLICY IF EXISTS "Authenticated users can update project rooms" ON public.project_rooms;
DROP POLICY IF EXISTS "Authenticated users can delete project rooms" ON public.project_rooms;

CREATE POLICY "Users can view project rooms in their tenant"
ON public.project_rooms FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert project rooms in their tenant"
ON public.project_rooms FOR INSERT
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update project rooms in their tenant"
ON public.project_rooms FOR UPDATE
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete project rooms in their tenant"
ON public.project_rooms FOR DELETE
USING (tenant_id = public.get_user_tenant_id());

-- Update RLS policies for project_room_works
DROP POLICY IF EXISTS "Authenticated users can view project room works" ON public.project_room_works;
DROP POLICY IF EXISTS "Authenticated users can insert project room works" ON public.project_room_works;
DROP POLICY IF EXISTS "Authenticated users can update project room works" ON public.project_room_works;
DROP POLICY IF EXISTS "Authenticated users can delete project room works" ON public.project_room_works;

CREATE POLICY "Users can view project room works in their tenant"
ON public.project_room_works FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert project room works in their tenant"
ON public.project_room_works FOR INSERT
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update project room works in their tenant"
ON public.project_room_works FOR UPDATE
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete project room works in their tenant"
ON public.project_room_works FOR DELETE
USING (tenant_id = public.get_user_tenant_id());

-- Update RLS policies for work_room_types
DROP POLICY IF EXISTS "Authenticated users can view work room types" ON public.work_room_types;
DROP POLICY IF EXISTS "Authenticated users can insert work room types" ON public.work_room_types;
DROP POLICY IF EXISTS "Authenticated users can update work room types" ON public.work_room_types;
DROP POLICY IF EXISTS "Authenticated users can delete work room types" ON public.work_room_types;

CREATE POLICY "Users can view work room types in their tenant"
ON public.work_room_types FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert work room types in their tenant"
ON public.work_room_types FOR INSERT
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update work room types in their tenant"
ON public.work_room_types FOR UPDATE
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete work room types in their tenant"
ON public.work_room_types FOR DELETE
USING (tenant_id = public.get_user_tenant_id());

-- Update the handle_new_user function to create a tenant for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Create a new tenant for the user
  INSERT INTO public.tenants (name)
  VALUES (COALESCE(NEW.email, 'Organization'))
  RETURNING id INTO new_tenant_id;
  
  -- Create the profile with the tenant_id
  INSERT INTO public.profiles (user_id, email, tenant_id)
  VALUES (NEW.id, NEW.email, new_tenant_id);
  
  RETURN NEW;
END;
$$;
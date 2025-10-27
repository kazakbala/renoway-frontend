-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create works table
CREATE TABLE public.works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit_type TEXT NOT NULL,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create project_blocks table
CREATE TABLE public.project_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create project_works table (works within project blocks)
CREATE TABLE public.project_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_block_id UUID REFERENCES public.project_blocks(id) ON DELETE CASCADE NOT NULL,
  work_id UUID REFERENCES public.works(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit_type TEXT NOT NULL,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_works ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for clients (authenticated users can manage)
CREATE POLICY "Authenticated users can view clients" ON public.clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients" ON public.clients
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete clients" ON public.clients
  FOR DELETE TO authenticated USING (true);

-- RLS Policies for categories
CREATE POLICY "Authenticated users can view categories" ON public.categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert categories" ON public.categories
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories" ON public.categories
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete categories" ON public.categories
  FOR DELETE TO authenticated USING (true);

-- RLS Policies for works
CREATE POLICY "Authenticated users can view works" ON public.works
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert works" ON public.works
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update works" ON public.works
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete works" ON public.works
  FOR DELETE TO authenticated USING (true);

-- RLS Policies for projects
CREATE POLICY "Authenticated users can view projects" ON public.projects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects" ON public.projects
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete projects" ON public.projects
  FOR DELETE TO authenticated USING (true);

-- RLS Policies for project_blocks
CREATE POLICY "Authenticated users can view project_blocks" ON public.project_blocks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert project_blocks" ON public.project_blocks
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update project_blocks" ON public.project_blocks
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete project_blocks" ON public.project_blocks
  FOR DELETE TO authenticated USING (true);

-- RLS Policies for project_works
CREATE POLICY "Authenticated users can view project_works" ON public.project_works
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert project_works" ON public.project_works
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update project_works" ON public.project_works
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete project_works" ON public.project_works
  FOR DELETE TO authenticated USING (true);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_works_updated_at
  BEFORE UPDATE ON public.works
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_project_works_updated_at
  BEFORE UPDATE ON public.project_works
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
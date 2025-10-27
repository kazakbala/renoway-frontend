-- Create projects table
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Authenticated users can view projects"
ON public.projects FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert projects"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects"
ON public.projects FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete projects"
ON public.projects FOR DELETE
TO authenticated
USING (true);

-- Create project_rooms table
CREATE TABLE public.project_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  room_type_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE RESTRICT,
  opening_area numeric,
  wall_area numeric,
  floor_area numeric,
  perimeter numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_rooms
CREATE POLICY "Authenticated users can view project rooms"
ON public.project_rooms FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert project rooms"
ON public.project_rooms FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update project rooms"
ON public.project_rooms FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete project rooms"
ON public.project_rooms FOR DELETE
TO authenticated
USING (true);

-- Create project_room_works table
CREATE TABLE public.project_room_works (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_room_id uuid NOT NULL REFERENCES public.project_rooms(id) ON DELETE CASCADE,
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  is_selected boolean NOT NULL DEFAULT false,
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_room_id, work_id)
);

-- Enable RLS
ALTER TABLE public.project_room_works ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_room_works
CREATE POLICY "Authenticated users can view project room works"
ON public.project_room_works FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert project room works"
ON public.project_room_works FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update project room works"
ON public.project_room_works FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete project room works"
ON public.project_room_works FOR DELETE
TO authenticated
USING (true);

-- Add trigger for updated_at on projects
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
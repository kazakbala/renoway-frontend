-- Create a trigger function to automatically set tenant_id on insert
CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_user_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Add triggers to automatically set tenant_id on all tables
CREATE TRIGGER set_tenant_id_clients
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER set_tenant_id_categories
  BEFORE INSERT ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER set_tenant_id_works
  BEFORE INSERT ON public.works
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER set_tenant_id_projects
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER set_tenant_id_room_types
  BEFORE INSERT ON public.room_types
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER set_tenant_id_project_rooms
  BEFORE INSERT ON public.project_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER set_tenant_id_project_room_works
  BEFORE INSERT ON public.project_room_works
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER set_tenant_id_work_room_types
  BEFORE INSERT ON public.work_room_types
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();
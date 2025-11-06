-- Add foreign key relationship between project_materials and materials
ALTER TABLE public.project_materials 
ADD CONSTRAINT project_materials_material_id_fkey 
FOREIGN KEY (material_id) 
REFERENCES public.materials(id) 
ON DELETE CASCADE;
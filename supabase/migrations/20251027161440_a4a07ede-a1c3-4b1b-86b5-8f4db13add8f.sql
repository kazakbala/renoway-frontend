-- Drop all project-related tables and their dependencies

-- Drop invoice_items first (depends on invoices and project_works)
DROP TABLE IF EXISTS public.invoice_items CASCADE;

-- Drop invoices (depends on projects)
DROP TABLE IF EXISTS public.invoices CASCADE;

-- Drop project_works (depends on project_blocks)
DROP TABLE IF EXISTS public.project_works CASCADE;

-- Drop project_blocks (depends on projects)
DROP TABLE IF EXISTS public.project_blocks CASCADE;

-- Drop projects table
DROP TABLE IF EXISTS public.projects CASCADE;
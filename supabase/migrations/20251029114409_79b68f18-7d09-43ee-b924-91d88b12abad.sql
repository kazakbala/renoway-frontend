-- Add timeline_categories JSON field to projects table
ALTER TABLE public.projects
ADD COLUMN timeline_categories JSONB DEFAULT '[]'::jsonb;
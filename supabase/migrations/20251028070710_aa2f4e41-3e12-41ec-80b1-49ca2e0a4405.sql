-- Add name column to project_rooms table
ALTER TABLE public.project_rooms 
ADD COLUMN name TEXT NOT NULL DEFAULT 'Room 1';
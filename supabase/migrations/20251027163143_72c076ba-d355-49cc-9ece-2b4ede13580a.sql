-- Create room_types table
CREATE TABLE public.room_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for work-room_type relationship
CREATE TABLE public.work_room_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(work_id, room_type_id)
);

-- Enable RLS
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_room_types ENABLE ROW LEVEL SECURITY;

-- RLS policies for room_types
CREATE POLICY "Authenticated users can view room types"
ON public.room_types FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert room types"
ON public.room_types FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update room types"
ON public.room_types FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete room types"
ON public.room_types FOR DELETE
USING (true);

-- RLS policies for work_room_types
CREATE POLICY "Authenticated users can view work room types"
ON public.work_room_types FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert work room types"
ON public.work_room_types FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update work room types"
ON public.work_room_types FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete work room types"
ON public.work_room_types FOR DELETE
USING (true);
-- Fix search_path for the clear_room_types_for_general_work function
CREATE OR REPLACE FUNCTION clear_room_types_for_general_work()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_general = true THEN
    DELETE FROM work_room_types WHERE work_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
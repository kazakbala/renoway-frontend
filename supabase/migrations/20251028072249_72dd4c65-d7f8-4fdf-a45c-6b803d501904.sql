-- Add is_general field to works table
ALTER TABLE works ADD COLUMN is_general boolean NOT NULL DEFAULT false;

-- When a work is general, clear its room type associations
-- This trigger will automatically clear room types when is_general is set to true
CREATE OR REPLACE FUNCTION clear_room_types_for_general_work()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_general = true THEN
    DELETE FROM work_room_types WHERE work_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clear_room_types_on_general_work
  AFTER UPDATE OF is_general ON works
  FOR EACH ROW
  WHEN (NEW.is_general = true AND OLD.is_general = false)
  EXECUTE FUNCTION clear_room_types_for_general_work();
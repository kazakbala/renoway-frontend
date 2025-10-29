import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2 } from "lucide-react";

interface SortableTimelineItemProps {
  category: { id: string; name: string; days: number };
  index: number;
  onUpdate: (field: string, value: any) => void;
  onDelete: () => void;
}

export const SortableTimelineItem = ({
  category,
  index,
  onUpdate,
  onDelete,
}: SortableTimelineItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <Input
        value={category.name}
        onChange={(e) => onUpdate("name", e.target.value)}
        className="flex-1"
        placeholder="Phase name"
      />
      <Input
        type="number"
        min="0"
        step="1"
        value={category.days}
        onChange={(e) => onUpdate("days", parseFloat(e.target.value) || 0)}
        className="w-24"
        placeholder="Days"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

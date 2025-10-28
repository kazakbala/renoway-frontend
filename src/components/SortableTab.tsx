import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TabsTrigger } from "@/components/ui/tabs";

interface SortableTabProps {
  id: string;
  children: React.ReactNode;
  value: string;
}

export function SortableTab({ id, children, value }: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TabsTrigger
      ref={setNodeRef}
      style={style}
      value={value}
      {...attributes}
      {...listeners}
    >
      {children}
    </TabsTrigger>
  );
}

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { MeetingFormDialog } from "@/components/MeetingFormDialog";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 - 19:00

const Meetings = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
  
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleSlotClick = (day: Date, hour: number) => {
    setSelectedSlot({ date: day, hour });
    setDialogOpen(true);
  };

  const handleCreateMeeting = () => {
    setSelectedSlot(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
        </div>
        <h2 className="text-lg font-semibold">
          {format(weekStart, "d MMM")} - {format(addDays(weekStart, 6), "d MMM yyyy")}
        </h2>
        <Button onClick={handleCreateMeeting}>
          <Plus className="h-4 w-4 mr-2" />
          New Meeting
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Days header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/50">
          <div className="p-2 border-r" />
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={`p-2 text-center border-r last:border-r-0 ${
                format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                  ? "bg-primary/10"
                  : ""
              }`}
            >
              <div className="text-xs text-muted-foreground uppercase">
                {format(day, "EEE")}
              </div>
              <div className={`text-lg font-semibold ${
                format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                  ? "text-primary"
                  : ""
              }`}>
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>

        {/* Time slots */}
        <div className="max-h-[600px] overflow-y-auto">
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b last:border-b-0">
              <div className="p-2 text-xs text-muted-foreground text-right pr-3 border-r">
                {hour}:00
              </div>
              {weekDays.map((day) => (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  onClick={() => handleSlotClick(day, hour)}
                  className={`h-16 border-r last:border-r-0 hover:bg-muted/30 cursor-pointer transition-colors ${
                    format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                      ? "bg-primary/5"
                      : ""
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <MeetingFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultDate={selectedSlot?.date}
        defaultHour={selectedSlot?.hour}
      />
    </div>
  );
};

export default Meetings;

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Video, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from "date-fns";
import { MeetingFormDialog } from "@/components/MeetingFormDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 - 19:00

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  type: "online" | "offline";
  assigned_to: string;
  assigned_profile: { email: string | null } | null;
}

const Meetings = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
  
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: meetings, refetch } = useQuery({
    queryKey: ["meetings", format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select(`
          id,
          title,
          start_time,
          end_time,
          type,
          assigned_to,
          assigned_profile:profiles!meetings_assigned_to_fkey(email)
        `)
        .gte("start_time", weekStart.toISOString())
        .lte("start_time", addDays(weekEnd, 1).toISOString());
      
      if (error) throw error;
      return data;
    },
  });

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

  const getMeetingsForSlot = (day: Date, hour: number) => {
    if (!meetings) return [];
    return meetings.filter((meeting) => {
      const startTime = parseISO(meeting.start_time);
      return isSameDay(startTime, day) && startTime.getHours() === hour;
    });
  };

  const getMeetingStyle = (meeting: Meeting) => {
    const startTime = parseISO(meeting.start_time);
    const endTime = parseISO(meeting.end_time);
    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const height = Math.max(durationHours * 64, 32); // 64px per hour, min 32px
    return { height: `${height}px` };
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
              {weekDays.map((day) => {
                const slotMeetings = getMeetingsForSlot(day, hour);
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    onClick={() => handleSlotClick(day, hour)}
                    className={`h-16 border-r last:border-r-0 hover:bg-muted/30 cursor-pointer transition-colors relative ${
                      format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                        ? "bg-primary/5"
                        : ""
                    }`}
                  >
                    {slotMeetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        style={getMeetingStyle(meeting)}
                        className={`absolute inset-x-0.5 top-0 rounded-md p-1 text-xs overflow-hidden z-10 ${
                          meeting.type === "online"
                            ? "bg-blue-500/90 text-white"
                            : "bg-green-500/90 text-white"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1 font-medium truncate">
                          {meeting.type === "online" ? (
                            <Video className="h-3 w-3 shrink-0" />
                          ) : (
                            <Building className="h-3 w-3 shrink-0" />
                          )}
                          <span className="truncate">{meeting.title}</span>
                        </div>
                        <div className="text-[10px] opacity-80 truncate">
                          {format(parseISO(meeting.start_time), "HH:mm")} - {format(parseISO(meeting.end_time), "HH:mm")}
                        </div>
                        {meeting.assigned_profile?.email && (
                          <div className="text-[10px] opacity-80 truncate">
                            {meeting.assigned_profile.email}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <MeetingFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultDate={selectedSlot?.date}
        defaultHour={selectedSlot?.hour}
        onSuccess={refetch}
      />
    </div>
  );
};

export default Meetings;

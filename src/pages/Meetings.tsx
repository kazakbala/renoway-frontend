import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Video, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from "date-fns";
import { MeetingFormDialog, MeetingData } from "@/components/MeetingFormDialog";
import { useQuery } from "@tanstack/react-query";
import api from "@/api/client";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  type: "online" | "offline";
  assigned_to: string;
  assigned_to_email: string;
  location: string | null;
  location_link: string | null;
  notes: string | null;
}

const Meetings = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingData | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: meetings, refetch } = useQuery({
    queryKey: ["meetings", format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data } = await api.get("/meetings/", {
        params: {
          start_time_after: weekStart.toISOString(),
          start_time_before: addDays(weekEnd, 1).toISOString(),
        },
      });
      return (data.results ?? data) as Meeting[];
    },
  });

  const handleSlotClick = (day: Date, hour: number) => {
    setSelectedMeeting(null);
    setSelectedSlot({ date: day, hour });
    setDialogOpen(true);
  };

  const handleMeetingClick = (meeting: Meeting, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSlot(null);
    setSelectedMeeting({
      id: meeting.id,
      title: meeting.title,
      assigned_to: meeting.assigned_to,
      type: meeting.type,
      location: meeting.location,
      location_link: meeting.location_link,
      start_time: meeting.start_time,
      end_time: meeting.end_time,
      notes: meeting.notes,
    });
    setDialogOpen(true);
  };

  const getMeetingsForSlot = (day: Date, hour: number) =>
    (meetings || []).filter((m) => {
      const t = parseISO(m.start_time);
      return isSameDay(t, day) && t.getHours() === hour;
    });

  const getMeetingHeight = (meeting: Meeting) => {
    const duration = (new Date(meeting.end_time).getTime() - new Date(meeting.start_time).getTime()) / (1000 * 60 * 60);
    return `${Math.max(duration * 64, 32)}px`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Today</Button>
        </div>
        <h2 className="text-lg font-semibold">
          {format(weekStart, "d MMM")} - {format(addDays(weekStart, 6), "d MMM yyyy")}
        </h2>
        <Button onClick={() => { setSelectedMeeting(null); setSelectedSlot(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />New Meeting
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/50">
          <div className="p-2 border-r" />
          {weekDays.map((day) => (
            <div key={day.toISOString()} className={`p-2 text-center border-r last:border-r-0 ${format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") ? "bg-primary/10" : ""}`}>
              <div className="text-xs text-muted-foreground uppercase">{format(day, "EEE")}</div>
              <div className={`text-lg font-semibold ${format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") ? "text-primary" : ""}`}>{format(day, "d")}</div>
            </div>
          ))}
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b last:border-b-0">
              <div className="p-2 text-xs text-muted-foreground text-right pr-3 border-r">{hour}:00</div>
              {weekDays.map((day) => {
                const slotMeetings = getMeetingsForSlot(day, hour);
                return (
                  <div key={`${day.toISOString()}-${hour}`} onClick={() => handleSlotClick(day, hour)}
                    className={`h-16 border-r last:border-r-0 hover:bg-muted/30 cursor-pointer transition-colors relative ${format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") ? "bg-primary/5" : ""}`}>
                    {slotMeetings.map((meeting, index) => {
                      const total = slotMeetings.length;
                      return (
                        <div key={meeting.id}
                          style={{ height: getMeetingHeight(meeting), width: total > 1 ? `calc(${100 / total}% - 2px)` : "calc(100% - 4px)", left: total > 1 ? `calc(${(index * 100) / total}% + 1px)` : "2px" }}
                          className={`absolute top-0 rounded-md p-1 text-xs overflow-hidden z-10 cursor-pointer hover:opacity-90 ${meeting.type === "online" ? "bg-blue-500/90 text-white" : "bg-green-500/90 text-white"}`}
                          onClick={(e) => handleMeetingClick(meeting, e)}>
                          <div className="flex items-center gap-1 font-medium truncate">
                            {meeting.type === "online" ? <Video className="h-3 w-3 shrink-0" /> : <Building className="h-3 w-3 shrink-0" />}
                            <span className="truncate">{meeting.title}</span>
                          </div>
                          <div className="text-[10px] opacity-80 truncate">
                            {format(parseISO(meeting.start_time), "HH:mm")} - {format(parseISO(meeting.end_time), "HH:mm")}
                          </div>
                          {meeting.assigned_to_email && (
                            <div className="text-[10px] opacity-80 truncate">{meeting.assigned_to_email}</div>
                          )}
                        </div>
                      );
                    })}
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
        meeting={selectedMeeting}
        onSuccess={refetch}
      />
    </div>
  );
};

export default Meetings;

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, MapPin, Link, Video, Building } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const meetingFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  assigned_to: z.string().min(1, "Assigned to is required"),
  type: z.enum(["online", "offline"]),
  location: z.string().optional(),
  location_link: z.string().url().optional().or(z.literal("")),
  start_date: z.date({ required_error: "Start date is required" }),
  start_time: z.string().min(1, "Start time is required"),
  end_date: z.date({ required_error: "End date is required" }),
  end_time: z.string().min(1, "End time is required"),
  notes: z.string().optional(),
});

type MeetingFormValues = z.infer<typeof meetingFormSchema>;

interface MeetingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  defaultHour?: number;
  onSuccess?: () => void;
}

export function MeetingFormDialog({
  open,
  onOpenChange,
  defaultDate,
  defaultHour,
  onSuccess,
}: MeetingFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      title: "",
      assigned_to: "",
      type: "offline",
      location: "",
      location_link: "",
      start_date: defaultDate || new Date(),
      start_time: defaultHour ? `${String(defaultHour).padStart(2, "0")}:00` : "09:00",
      end_date: defaultDate || new Date(),
      end_time: defaultHour ? `${String(defaultHour + 1).padStart(2, "0")}:00` : "10:00",
      notes: "",
    },
  });

  const meetingType = form.watch("type");

  const onSubmit = async (values: MeetingFormValues) => {
    setIsSubmitting(true);
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        toast.error("You must be logged in to create a meeting");
        return;
      }

      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", currentUser.user.id)
        .single();

      if (!currentProfile) {
        toast.error("Profile not found");
        return;
      }

      const startDateTime = new Date(values.start_date);
      const [startHours, startMinutes] = values.start_time.split(":");
      startDateTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

      const endDateTime = new Date(values.end_date);
      const [endHours, endMinutes] = values.end_time.split(":");
      endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

      const { error } = await supabase.from("meetings").insert({
        title: values.title,
        created_by: currentProfile.id,
        assigned_to: values.assigned_to,
        type: values.type,
        location: values.location || null,
        location_link: values.location_link || null,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        notes: values.notes || null,
      });

      if (error) throw error;

      toast.success("Meeting created successfully");
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to create meeting");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Meeting</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Meeting title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {profiles?.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Type</FormLabel>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={field.value === "offline" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => field.onChange("offline")}
                    >
                      <Building className="mr-2 h-4 w-4" />
                      Offline
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "online" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => field.onChange("online")}
                    >
                      <Video className="mr-2 h-4 w-4" />
                      Online
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {meetingType === "online" ? "Meeting Link" : "Location"}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      {meetingType === "online" ? (
                        <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      ) : (
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      )}
                      <Input
                        placeholder={
                          meetingType === "online"
                            ? "https://meet.google.com/..."
                            : "Office address"
                        }
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {meetingType === "offline" && (
              <FormField
                control={form.control}
                name="location_link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Maps Link</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="https://maps.google.com/..."
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about the meeting..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Meeting"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

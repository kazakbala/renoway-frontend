import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { CalendarIcon, MapPin, Link, Video, Building, Trash2, Loader2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useGoogleMapsApi } from "@/hooks/useGoogleMapsApi";
import { MeetingLocationMap } from "@/components/MeetingLocationMap";

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

export interface MeetingData {
  id: string;
  title: string;
  assigned_to: string;
  type: "online" | "offline";
  location: string | null;
  location_link: string | null;
  start_time: string;
  end_time: string;
  notes: string | null;
}

interface MeetingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  defaultHour?: number;
  meeting?: MeetingData | null;
  onSuccess?: () => void;
}

export function MeetingFormDialog({
  open,
  onOpenChange,
  defaultDate,
  defaultHour,
  meeting,
  onSuccess,
}: MeetingFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isEditMode = !!meeting;

  const { apiKey, isLoading: isLoadingApiKey, error: apiKeyError } = useGoogleMapsApi();

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

  const getDefaultValues = (): MeetingFormValues => {
    if (meeting) {
      const startDate = parseISO(meeting.start_time);
      const endDate = parseISO(meeting.end_time);
      return {
        title: meeting.title,
        assigned_to: meeting.assigned_to,
        type: meeting.type,
        location: meeting.location || "",
        location_link: meeting.location_link || "",
        start_date: startDate,
        start_time: format(startDate, "HH:mm"),
        end_date: endDate,
        end_time: format(endDate, "HH:mm"),
        notes: meeting.notes || "",
      };
    }
    return {
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
    };
  };

  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: getDefaultValues(),
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues());
    }
  }, [open, meeting]);

  const meetingType = form.watch("type");

  const handleLocationSelect = (location: string, link: string) => {
    form.setValue("location", location);
    form.setValue("location_link", link);
  };

  const onSubmit = async (values: MeetingFormValues) => {
    setIsSubmitting(true);
    try {
      const startDateTime = new Date(values.start_date);
      const [startHours, startMinutes] = values.start_time.split(":");
      startDateTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

      const endDateTime = new Date(values.end_date);
      const [endHours, endMinutes] = values.end_time.split(":");
      endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

      const meetingData = {
        title: values.title,
        assigned_to: values.assigned_to,
        type: values.type,
        location: values.location || null,
        location_link: values.location_link || null,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        notes: values.notes || null,
      };

      if (isEditMode && meeting) {
        const { error } = await supabase
          .from("meetings")
          .update(meetingData)
          .eq("id", meeting.id);

        if (error) throw error;
        toast.success("Meeting updated successfully");
      } else {
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

        const { error } = await supabase.from("meetings").insert({
          ...meetingData,
          created_by: currentProfile.id,
        });

        if (error) throw error;
        toast.success("Meeting created successfully");
      }

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Failed to ${isEditMode ? "update" : "create"} meeting`;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!meeting) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("meetings")
        .delete()
        .eq("id", meeting.id);

      if (error) throw error;
      toast.success("Meeting deleted successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete meeting";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const showMap = meetingType === "offline" && apiKey && !apiKeyError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "max-h-[90vh] overflow-y-auto",
          showMap ? "max-w-4xl" : "max-w-lg"
        )}
        onInteractOutside={(e) => {
          // Prevent closing when clicking on Google Places autocomplete
          const target = e.target as HTMLElement;
          if (target.closest('.pac-container')) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Meeting" : "Create Meeting"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
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

            {/* Assigned To */}
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

            {/* Meeting Type */}
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

            {/* Location Search with Map (for offline meetings) */}
            {meetingType === "offline" && (
              <div className="space-y-4">
                {showMap && (
                  <div className="rounded-lg overflow-hidden">
                    <MeetingLocationMap
                      apiKey={apiKey}
                      onLocationSelect={handleLocationSelect}
                    />
                  </div>
                )}

                {isLoadingApiKey && (
                  <div className="flex items-center justify-center h-[320px] md:h-[420px] border rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading map...
                    </div>
                  </div>
                )}

                {apiKeyError && (
                  <div className="flex items-center justify-center min-h-[100px] border rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground text-center px-4">
                      Map unavailable. You can still enter the location manually.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Location field */}
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

            {/* Google Maps Link (for offline meetings) */}
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

            {/* Start Date/Time */}
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

            {/* End Date/Time */}
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

            {/* Notes */}
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

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              {isEditMode ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" disabled={isDeleting}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this meeting? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Meeting" : "Create Meeting")}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

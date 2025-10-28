import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

interface Client {
  id: string;
  full_name: string | null;
}

interface RoomType {
  id: string;
  name: string;
}

interface Work {
  id: string;
  name: string;
  price_per_unit: number;
  unit_type: string;
  calculation_base: string;
  work_room_types?: Array<{ room_type_id: string }>;
}

interface RoomWork {
  work_id: string;
  is_selected: boolean;
  quantity: number;
  work?: Work;
}

interface Room {
  id?: string;
  room_type_id: string;
  opening_area: string;
  wall_area: string;
  floor_area: string;
  perimeter: string;
  works: RoomWork[];
  room_types?: RoomType;
}

const ProjectForm = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projectName, setProjectName] = useState("");
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [allWorks, setAllWorks] = useState<Work[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    const [clientsRes, roomTypesRes, worksRes] = await Promise.all([
      supabase.from("clients").select("*").order("full_name"),
      supabase.from("room_types").select("*").order("name"),
      supabase.from("works").select("*, work_room_types(room_type_id)"),
    ]);

    if (clientsRes.data) setClients(clientsRes.data);
    if (roomTypesRes.data) setRoomTypes(roomTypesRes.data);
    if (worksRes.data) setAllWorks(worksRes.data);

    if (id) {
      const { data: project } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (project) {
        setProjectName(project.name);
        setClientId(project.client_id);

        const { data: projectRooms } = await supabase
          .from("project_rooms")
          .select(`
            *,
            room_types(id, name),
            project_room_works(work_id, is_selected, quantity)
          `)
          .eq("project_id", id);

        if (projectRooms) {
          const roomsData = await Promise.all(
            projectRooms.map(async (room: any) => {
              const worksData = room.project_room_works.map((w: any) => ({
                work_id: w.work_id,
                is_selected: w.is_selected,
                quantity: w.quantity,
              }));

              return {
                id: room.id,
                room_type_id: room.room_type_id,
                opening_area: room.opening_area?.toString() || "",
                wall_area: room.wall_area?.toString() || "",
                floor_area: room.floor_area?.toString() || "",
                perimeter: room.perimeter?.toString() || "",
                works: worksData,
                room_types: room.room_types,
              };
            })
          );
          setRooms(roomsData);
        }
      }
    }
  };

  const addRoom = () => {
    setRooms([
      ...rooms,
      {
        room_type_id: "",
        opening_area: "",
        wall_area: "",
        floor_area: "",
        perimeter: "",
        works: [],
      },
    ]);
  };

  const removeRoom = (index: number) => {
    setRooms(rooms.filter((_, i) => i !== index));
  };

  const updateRoom = (index: number, field: keyof Room, value: any) => {
    const newRooms = [...rooms];
    if (field === "room_type_id") {
      // When room type changes, initialize works for that room type
      const roomTypeWorks = allWorks.filter((work) =>
        work.work_room_types?.some((wrt: any) => wrt.room_type_id === value)
      );
      
      newRooms[index] = {
        ...newRooms[index],
        [field]: value,
        works: roomTypeWorks.map((work) => ({
          work_id: work.id,
          is_selected: false,
          quantity: 0,
        })),
      };
    } else {
      newRooms[index] = { ...newRooms[index], [field]: value };
      
      // Recalculate quantities based on areas
      if (["opening_area", "wall_area", "floor_area", "perimeter"].includes(field)) {
        newRooms[index].works = newRooms[index].works.map((rw) => {
          const work = allWorks.find((w) => w.id === rw.work_id);
          if (work && rw.is_selected) {
            const quantity = calculateDefaultQuantity(work, newRooms[index]);
            return { ...rw, quantity };
          }
          return rw;
        });
      }
    }
    setRooms(newRooms);
  };

  const calculateDefaultQuantity = (work: Work, room: Room): number => {
    if (!work.calculation_base) {
      return 1;
    }
    
    switch (work.calculation_base) {
      case "floor":
        return parseFloat(room.floor_area) || 0;
      case "wall":
        const wallArea = parseFloat(room.wall_area) || 0;
        const openingArea = parseFloat(room.opening_area) || 0;
        return wallArea - openingArea;
      case "perimeter":
        return parseFloat(room.perimeter) || 0;
      default:
        return 1;
    }
  };

  const updateRoomWork = (
    roomIndex: number,
    workId: string,
    field: "is_selected" | "quantity",
    value: any
  ) => {
    const newRooms = [...rooms];
    const workIndex = newRooms[roomIndex].works.findIndex((w) => w.work_id === workId);
    
    if (field === "is_selected" && value) {
      // Auto-calculate quantity when selecting a work
      const work = allWorks.find((w) => w.id === workId);
      if (work) {
        newRooms[roomIndex].works[workIndex] = {
          ...newRooms[roomIndex].works[workIndex],
          is_selected: value,
          quantity: calculateDefaultQuantity(work, newRooms[roomIndex]),
        };
      }
    } else {
      newRooms[roomIndex].works[workIndex] = {
        ...newRooms[roomIndex].works[workIndex],
        [field]: value,
      };
    }
    
    setRooms(newRooms);
  };

  const calculateRoomSubtotal = (room: Room): number => {
    return room.works.reduce((sum, rw) => {
      if (rw.is_selected) {
        const work = allWorks.find((w) => w.id === rw.work_id);
        if (work) {
          return sum + work.price_per_unit * rw.quantity;
        }
      }
      return sum;
    }, 0);
  };

  const calculateProjectTotal = (): number => {
    return rooms.reduce((sum, room) => sum + calculateRoomSubtotal(room), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      if (id) {
        // Update project
        const { error: projectError } = await supabase
          .from("projects")
          .update({ name: projectName, client_id: clientId })
          .eq("id", id);

        if (projectError) throw projectError;

        // Delete existing rooms and their works (cascade will handle works)
        await supabase.from("project_rooms").delete().eq("project_id", id);
      } else {
        // Create project
        const { data: project, error: projectError } = await supabase
          .from("projects")
          .insert({
            name: projectName,
            client_id: clientId,
            user_id: user.id,
          })
          .select()
          .single();

        if (projectError) throw projectError;
        
        // Use the newly created project id
        const projectId = project.id;
        
        // Insert rooms and works
        for (const room of rooms) {
          const { data: newRoom, error: roomError } = await supabase
            .from("project_rooms")
            .insert({
              project_id: projectId,
              room_type_id: room.room_type_id,
              opening_area: parseFloat(room.opening_area) || null,
              wall_area: parseFloat(room.wall_area) || null,
              floor_area: parseFloat(room.floor_area) || null,
              perimeter: parseFloat(room.perimeter) || null,
            })
            .select()
            .single();

          if (roomError) throw roomError;

          // Insert room works
          const roomWorks = room.works
            .filter((w) => w.is_selected)
            .map((w) => ({
              project_room_id: newRoom.id,
              work_id: w.work_id,
              is_selected: w.is_selected,
              quantity: w.quantity,
            }));

          if (roomWorks.length > 0) {
            const { error: worksError } = await supabase
              .from("project_room_works")
              .insert(roomWorks);

            if (worksError) throw worksError;
          }
        }

        toast({
          title: "Success",
          description: "Project created successfully.",
        });
        navigate("/dashboard/projects");
        return;
      }

      // For update, insert new rooms
      for (const room of rooms) {
        const { data: newRoom, error: roomError } = await supabase
          .from("project_rooms")
          .insert({
            project_id: id,
            room_type_id: room.room_type_id,
            opening_area: parseFloat(room.opening_area) || null,
            wall_area: parseFloat(room.wall_area) || null,
            floor_area: parseFloat(room.floor_area) || null,
            perimeter: parseFloat(room.perimeter) || null,
          })
          .select()
          .single();

        if (roomError) throw roomError;

        const roomWorks = room.works
          .filter((w) => w.is_selected)
          .map((w) => ({
            project_room_id: newRoom.id,
            work_id: w.work_id,
            is_selected: w.is_selected,
            quantity: w.quantity,
          }));

        if (roomWorks.length > 0) {
          const { error: worksError } = await supabase
            .from("project_room_works")
            .insert(roomWorks);

          if (worksError) throw worksError;
        }
      }

      toast({
        title: "Success",
        description: "Project updated successfully.",
      });
      navigate("/dashboard/projects");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getWorksForRoom = (room: Room): (Work & { roomWork?: RoomWork })[] => {
    if (!room.room_type_id) return [];
    
    const roomTypeWorks = allWorks.filter((work) =>
      work.work_room_types?.some((wrt: any) => wrt.room_type_id === room.room_type_id)
    );

    return roomTypeWorks.map((work) => {
      const roomWork = room.works.find((w) => w.work_id === work.id);
      return { ...work, roomWork };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/projects")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">{id ? "Edit Project" : "New Project"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select value={clientId} onValueChange={setClientId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name || "Unnamed Client"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Rooms</h2>
          <Button type="button" onClick={addRoom} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Room
          </Button>
        </div>

        {rooms.map((room, roomIndex) => (
          <Card key={roomIndex}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  Room {roomIndex + 1}
                  {room.room_types && ` - ${room.room_types.name}`}
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRoom(roomIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Room Type</Label>
                  <Select
                    value={room.room_type_id}
                    onValueChange={(value) => updateRoom(roomIndex, "room_type_id", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map((rt) => (
                        <SelectItem key={rt.id} value={rt.id}>
                          {rt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Opening Area (m²)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={room.opening_area}
                    onChange={(e) => updateRoom(roomIndex, "opening_area", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Wall Area (m²)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={room.wall_area}
                    onChange={(e) => updateRoom(roomIndex, "wall_area", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Floor Area (m²)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={room.floor_area}
                    onChange={(e) => updateRoom(roomIndex, "floor_area", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Perimeter (m)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={room.perimeter}
                    onChange={(e) => updateRoom(roomIndex, "perimeter", e.target.value)}
                  />
                </div>
              </div>

              {room.room_type_id && getWorksForRoom(room).length > 0 && (
                <div className="space-y-2">
                  <Label>Works</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">Select</TableHead>
                          <TableHead>Work</TableHead>
                          <TableHead>Price/Unit</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getWorksForRoom(room).map((work) => {
                          const roomWork = work.roomWork || {
                            work_id: work.id,
                            is_selected: false,
                            quantity: 0,
                          };
                          return (
                            <TableRow key={work.id}>
                              <TableCell>
                                <Checkbox
                                  checked={roomWork.is_selected}
                                  onCheckedChange={(checked) =>
                                    updateRoomWork(roomIndex, work.id, "is_selected", checked)
                                  }
                                />
                              </TableCell>
                              <TableCell>{work.name}</TableCell>
                              <TableCell>AED {work.price_per_unit.toFixed(2)}</TableCell>
                              <TableCell>{work.unit_type}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={roomWork.quantity}
                                  onChange={(e) =>
                                    updateRoomWork(
                                      roomIndex,
                                      work.id,
                                      "quantity",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  disabled={!roomWork.is_selected}
                                  className="w-24"
                                />
                              </TableCell>
                              <TableCell>
                                AED {(work.price_per_unit * roomWork.quantity).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end pt-2">
                    <div className="text-lg font-semibold">
                      Room Subtotal: AED {calculateRoomSubtotal(room).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center text-2xl font-bold">
              <span>Project Total:</span>
              <span>AED {calculateProjectTotal().toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : id ? "Update Project" : "Create Project"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/dashboard/projects")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProjectForm;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Calculator, GripVertical, FileDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsContent } from "@/components/ui/tabs";
import { SortableTab } from "@/components/SortableTab";
import { SortableTimelineItem } from "@/components/SortableTimelineItem";
import { useAuth } from "@/contexts/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  name: string;
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
  const [activeTab, setActiveTab] = useState<string>("0");
  const [priceMultiplier, setPriceMultiplier] = useState<number>(1);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"amount" | "percentage">("amount");
  const [timelineCategories, setTimelineCategories] = useState<Array<{ id: string; name: string; days: number }>>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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
      const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();

      if (project) {
        setProjectName(project.name);
        setClientId(project.client_id);
        setPriceMultiplier(project.price_multiplier || 1);
        setDiscount(project.discount || 0);
        setDiscountType((project.discount_type as "amount" | "percentage") || "amount");
        setTimelineCategories((project.timeline_categories as Array<{ id: string; name: string; days: number }>) || []);

        const { data: projectRooms } = await supabase
          .from("project_rooms")
          .select(
            `
            *,
            room_types(id, name),
            project_room_works(work_id, is_selected, quantity)
          `,
          )
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
                name: room.name || `Room ${projectRooms.indexOf(room) + 1}`,
                room_type_id: room.room_type_id,
                opening_area: room.opening_area?.toString() || "",
                wall_area: room.wall_area?.toString() || "",
                floor_area: room.floor_area?.toString() || "",
                perimeter: room.perimeter?.toString() || "",
                works: worksData,
                room_types: room.room_types,
              };
            }),
          );
          setRooms(roomsData);
        }
      }
    }
  };

  const generateRoomName = (roomTypeId: string, currentRooms: Room[]): string => {
    if (!roomTypeId) return `Room ${currentRooms.length + 1}`;

    const roomType = roomTypes.find((rt) => rt.id === roomTypeId);
    if (!roomType) return `Room ${currentRooms.length + 1}`;

    const sameTypeCount = currentRooms.filter((r) => r.room_type_id === roomTypeId).length;
    return `${roomType.name} ${sameTypeCount + 1}`;
  };

  const addRoom = () => {
    const newRooms = [
      ...rooms,
      {
        name: `Room ${rooms.length + 1}`,
        room_type_id: "",
        opening_area: "",
        wall_area: "",
        floor_area: "",
        perimeter: "",
        works: [],
      },
    ];
    setRooms(newRooms);
    setActiveTab((newRooms.length - 1).toString());
  };

  const removeRoom = (index: number) => {
    const newRooms = rooms.filter((_, i) => i !== index);
    setRooms(newRooms);
    // Switch to first tab if current tab is removed
    if (parseInt(activeTab) === index && newRooms.length > 0) {
      setActiveTab("0");
    } else if (parseInt(activeTab) > index) {
      setActiveTab((parseInt(activeTab) - 1).toString());
    }
  };

  const updateRoom = (index: number, field: keyof Room, value: any) => {
    const newRooms = [...rooms];
    if (field === "room_type_id") {
      // When room type changes, initialize works for that room type and update name
      const roomTypeWorks = allWorks.filter((work) =>
        work.work_room_types?.some((wrt: any) => wrt.room_type_id === value),
      );

      newRooms[index] = {
        ...newRooms[index],
        [field]: value,
        name: generateRoomName(
          value,
          newRooms.filter((_, i) => i !== index),
        ),
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

  const updateRoomWork = (roomIndex: number, workId: string, field: "is_selected" | "quantity", value: any) => {
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
          return sum + work.price_per_unit * priceMultiplier * rw.quantity;
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
          .update({ 
            name: projectName, 
            client_id: clientId,
            price_multiplier: priceMultiplier,
            discount: discount,
            discount_type: discountType,
            timeline_categories: timelineCategories
          })
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
            price_multiplier: priceMultiplier,
            discount: discount,
            discount_type: discountType,
            timeline_categories: timelineCategories
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
              name: room.name,
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
            const { error: worksError } = await supabase.from("project_room_works").insert(roomWorks);

            if (worksError) throw worksError;
          }
        }

        toast({
          title: "Success",
          description: "Project created successfully.",
        });
        navigate(`/dashboard/projects/${projectId}`);
        return;
      }

      // For update, insert new rooms
      for (const room of rooms) {
        const { data: newRoom, error: roomError } = await supabase
          .from("project_rooms")
          .insert({
            project_id: id,
            name: room.name,
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
          const { error: worksError } = await supabase.from("project_room_works").insert(roomWorks);

          if (worksError) throw worksError;
        }
      }

      toast({
        title: "Success",
        description: "Project updated successfully.",
      });
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
      work.work_room_types?.some((wrt: any) => wrt.room_type_id === room.room_type_id),
    );

    return roomTypeWorks.map((work) => {
      const roomWork = room.works.find((w) => w.work_id === work.id);
      return { ...work, roomWork };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString());
      const newIndex = parseInt(over.id.toString());

      const newRooms = arrayMove(rooms, oldIndex, newIndex);
      setRooms(newRooms);
      setActiveTab(newIndex.toString());
    }
  };

  const handleTimelineDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = timelineCategories.findIndex((cat) => cat.id === active.id);
      const newIndex = timelineCategories.findIndex((cat) => cat.id === over.id);

      setTimelineCategories(arrayMove(timelineCategories, oldIndex, newIndex));
    }
  };

  const generatePDF = async () => {
    const doc = new jsPDF();
    
    // Get client name
    const client = clients.find(c => c.id === clientId);
    const clientName = client?.full_name || "N/A";
    
    // Set elegant business font
    doc.setFont("helvetica");
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(40, 40, 40);
    doc.text("PROJECT QUOTATION", 105, 20, { align: "center" });
    
    // Project and Client Info
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`Project: ${projectName}`, 20, 35);
    doc.text(`Client: ${clientName}`, 20, 42);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 49);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 53, 190, 53);
    
    let yPosition = 63;
    
    // Rooms and Works
    for (const room of rooms) {
      const roomType = roomTypes.find(rt => rt.id === room.room_type_id);
      const roomWorks = getWorksForRoom(room).filter(work => 
        room.works.find(rw => rw.work_id === work.id && rw.is_selected)
      );
      
      if (roomWorks.length === 0) continue;
      
      // Room header
      doc.setFontSize(13);
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text(`${room.name} (${roomType?.name || "Unknown"})`, 20, yPosition);
      yPosition += 8;
      
      // Works table
      const tableData = roomWorks.map(work => {
        const roomWork = room.works.find(rw => rw.work_id === work.id);
        const quantity = roomWork?.quantity || 0;
        const pricePerUnit = work.price_per_unit * priceMultiplier;
        const total = pricePerUnit * quantity;
        
        return [
          work.name,
          `${quantity.toFixed(2)} ${work.unit_type}`,
          `AED ${pricePerUnit.toFixed(2)}`,
          `AED ${total.toFixed(2)}`
        ];
      });
      
      autoTable(doc, {
        startY: yPosition,
        head: [["Work Item", "Quantity", "Price/Unit", "Total"]],
        body: tableData,
        theme: "striped",
        headStyles: { 
          fillColor: [70, 70, 70],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 10
        },
        styles: { 
          fontSize: 9,
          cellPadding: 4,
          font: "helvetica"
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 35, halign: "center" },
          2: { cellWidth: 35, halign: "right" },
          3: { cellWidth: 35, halign: "right" }
        },
        margin: { left: 20, right: 20 }
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 3;
      
      // Room subtotal
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const roomSubtotal = calculateRoomSubtotal(room);
      doc.text(`Room Subtotal: AED ${roomSubtotal.toFixed(2)}`, 155, yPosition, { align: "right" });
      yPosition += 10;
      
      // Add new page if needed
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
    }
    
    // Financial Summary
    yPosition += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;
    
    const subtotal = calculateProjectTotal();
    const discountAmount = discountType === "percentage" 
      ? subtotal * (discount / 100)
      : discount;
    const afterDiscount = subtotal - discountAmount;
    const vat = afterDiscount * 0.05;
    const grandTotal = afterDiscount + vat;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Subtotal:`, 130, yPosition);
    doc.text(`AED ${subtotal.toFixed(2)}`, 190, yPosition, { align: "right" });
    yPosition += 7;
    
    if (discount > 0) {
      doc.text(`Discount${discountType === "percentage" ? ` (${discount}%)` : ""}:`, 130, yPosition);
      doc.text(`-AED ${discountAmount.toFixed(2)}`, 190, yPosition, { align: "right" });
      yPosition += 7;
      
      doc.text(`After Discount:`, 130, yPosition);
      doc.text(`AED ${afterDiscount.toFixed(2)}`, 190, yPosition, { align: "right" });
      yPosition += 7;
    }
    
    doc.text(`VAT (5%):`, 130, yPosition);
    doc.text(`AED ${vat.toFixed(2)}`, 190, yPosition, { align: "right" });
    yPosition += 10;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`GRAND TOTAL:`, 130, yPosition);
    doc.text(`AED ${grandTotal.toFixed(2)}`, 190, yPosition, { align: "right" });
    
    // Save PDF
    doc.save(`${projectName.replace(/[^a-z0-9]/gi, '_')}_quotation.pdf`);
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
              <Input id="name" value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
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

        {rooms.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <SortableContext
                items={rooms.map((_, index) => index.toString())}
                strategy={horizontalListSortingStrategy}
              >
                <TabsList className="w-full justify-start overflow-x-auto">
                  {rooms.map((room, index) => (
                    <SortableTab key={index} id={index.toString()} value={index.toString()}>
                      {room.name}
                    </SortableTab>
                  ))}
                </TabsList>
              </SortableContext>

              {rooms.map((room, roomIndex) => (
                <TabsContent key={roomIndex} value={roomIndex.toString()}>
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>{room.name}</CardTitle>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeRoom(roomIndex)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Room Name</Label>
                          <Input
                            value={room.name}
                            onChange={(e) => updateRoom(roomIndex, "name", e.target.value)}
                            placeholder="Enter room name"
                            required
                          />
                        </div>
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
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                          <Label>Opening Area (m²)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={room.opening_area}
                            onChange={(e) => updateRoom(roomIndex, "opening_area", e.target.value)}
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
                                      <TableCell>AED {(work.price_per_unit * priceMultiplier).toFixed(2)}</TableCell>
                                      <TableCell>{work.unit_type}</TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={roomWork.quantity}
                                            onChange={(e) =>
                                              updateRoomWork(
                                                roomIndex,
                                                work.id,
                                                "quantity",
                                                parseFloat(e.target.value) || 0,
                                              )
                                            }
                                            disabled={!roomWork.is_selected}
                                            className="w-24"
                                          />
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              const calculatedQty = calculateDefaultQuantity(work, room);
                                              updateRoomWork(roomIndex, work.id, "quantity", calculatedQty);
                                            }}
                                            disabled={!roomWork.is_selected}
                                            className="h-10 w-10"
                                          >
                                            <Calculator className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                      <TableCell>AED {(work.price_per_unit * priceMultiplier * roomWork.quantity).toFixed(2)}</TableCell>
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
                </TabsContent>
              ))}
            </Tabs>
          </DndContext>
        )}

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priceMultiplier">Price Multiplier</Label>
                <Input
                  id="priceMultiplier"
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceMultiplier}
                  onChange={(e) => setPriceMultiplier(parseFloat(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Discount</Label>
                <div className="flex gap-2">
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={discountType === "percentage" ? 100 : undefined}
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="flex-1"
                  />
                  <Select value={discountType} onValueChange={(value: "amount" | "percentage") => setDiscountType(value)}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amount">AED</SelectItem>
                      <SelectItem value="percentage">%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between items-center text-lg">
                <span>Subtotal (with {priceMultiplier}x multiplier):</span>
                <span>AED {calculateProjectTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span>After Discount{discountType === "percentage" ? ` (${discount}%)` : ""}:</span>
                <span>AED {(() => {
                  const subtotal = calculateProjectTotal();
                  const discountAmount = discountType === "percentage" 
                    ? subtotal * (discount / 100)
                    : discount;
                  return (subtotal - discountAmount).toFixed(2);
                })()}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span>VAT (5%):</span>
                <span>AED {(() => {
                  const subtotal = calculateProjectTotal();
                  const discountAmount = discountType === "percentage" 
                    ? subtotal * (discount / 100)
                    : discount;
                  return ((subtotal - discountAmount) * 0.05).toFixed(2);
                })()}</span>
              </div>
              <div className="flex justify-between items-center text-2xl font-bold pt-2 border-t">
                <span>Grand Total:</span>
                <span>AED {(() => {
                  const subtotal = calculateProjectTotal();
                  const discountAmount = discountType === "percentage" 
                    ? subtotal * (discount / 100)
                    : discount;
                  return ((subtotal - discountAmount) * 1.05).toFixed(2);
                })()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleTimelineDragEnd}
            >
              <SortableContext
                items={timelineCategories.map((cat) => cat.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {timelineCategories.map((category, index) => (
                    <SortableTimelineItem
                      key={category.id}
                      category={category}
                      index={index}
                      onUpdate={(field, value) => {
                        const updated = [...timelineCategories];
                        updated[index] = { ...updated[index], [field]: value };
                        setTimelineCategories(updated);
                      }}
                      onDelete={() => {
                        setTimelineCategories(timelineCategories.filter((_, i) => i !== index));
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTimelineCategories([
                  ...timelineCategories,
                  { id: crypto.randomUUID(), name: "New Phase", days: 1 }
                ]);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Phase
            </Button>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total Duration:</span>
                <span>{timelineCategories.reduce((sum, cat) => sum + cat.days, 0)} business days</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : id ? "Update Project" : "Create Project"}
          </Button>
          {id && (
            <Button type="button" variant="secondary" onClick={generatePDF}>
              <FileDown className="mr-2 h-4 w-4" />
              Export as PDF
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => navigate("/dashboard/projects")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProjectForm;

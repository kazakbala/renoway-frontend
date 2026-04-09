import { useState, useEffect } from "react";
import api from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Calculator, FileDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface Client {
  id: string;
  full_name: string | null;
}

interface RoomType {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  display_order?: number;
}

interface Work {
  id: string;
  name: string;
  price_per_unit: number;
  unit_type: string;
  calculation_base: string | null;
  category: string | null;
  room_type_ids: string[];
}

interface RoomWork {
  work_id: string;
  is_selected: boolean;
  quantity: number;
  custom_price_per_unit?: number | null;
  custom_name?: string | null;
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
}

interface Material {
  id: string;
  name: string;
  unit_type: string;
  price_per_unit: number;
}

interface ProjectMaterial {
  id?: string;
  material_id: string;
  quantity: number;
}

const ProjectForm = () => {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projectName, setProjectName] = useState("");
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allWorks, setAllWorks] = useState<Work[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("0");
  const [priceMultiplier, setPriceMultiplier] = useState<number>(1);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"amount" | "percentage">("amount");
  const [advancePaymentPercentage, setAdvancePaymentPercentage] = useState<number>(30);
  const [timelineCategories, setTimelineCategories] = useState<Array<{ id: string; name: string; days: number }>>([]);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [projectMaterials, setProjectMaterials] = useState<ProjectMaterial[]>([]);
  // Track existing IDs for deletion during update
  const [existingRoomIds, setExistingRoomIds] = useState<string[]>([]);
  const [existingMaterialIds, setExistingMaterialIds] = useState<string[]>([]);

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
    const [clientsRes, roomTypesRes, worksRes, categoriesRes, materialsRes] = await Promise.all([
      api.get("/clients/"),
      api.get("/room-types/"),
      api.get("/works/"),
      api.get("/categories/"),
      api.get("/materials/"),
    ]);

    setClients(clientsRes.data.results ?? clientsRes.data);
    setRoomTypes(roomTypesRes.data.results ?? roomTypesRes.data);
    setAllWorks((worksRes.data.results ?? worksRes.data).map((w: any) => ({
      ...w,
      price_per_unit: parseFloat(w.price_per_unit) || 0,
    })));
    setCategories(categoriesRes.data.results ?? categoriesRes.data);
    setAllMaterials((materialsRes.data.results ?? materialsRes.data).map((m: any) => ({
      ...m,
      price_per_unit: parseFloat(m.price_per_unit) || 0,
    })));

    if (id) {
      try {
        const { data: project } = await api.get(`/projects/${id}/`);

        setProjectName(project.name);
        setClientId(project.client);
        setPriceMultiplier(project.price_multiplier || 1);
        setDiscount(project.discount || 0);
        setDiscountType((project.discount_type as "amount" | "percentage") || "amount");
        setAdvancePaymentPercentage(project.advance_payment_percentage || 30);
        setTimelineCategories((project.timeline_categories as Array<{ id: string; name: string; days: number }>) || []);

        const roomsData: Room[] = project.rooms.map((room: any) => ({
          id: room.id,
          name: room.name,
          room_type_id: room.room_type,
          opening_area: room.opening_area?.toString() || "",
          wall_area: room.wall_area?.toString() || "",
          floor_area: room.floor_area?.toString() || "",
          perimeter: room.perimeter?.toString() || "",
          works: room.works.map((rw: any) => ({
            work_id: rw.work,
            is_selected: rw.is_selected,
            quantity: parseFloat(rw.quantity) || 0,
            custom_price_per_unit: rw.custom_price_per_unit != null ? parseFloat(rw.custom_price_per_unit) : null,
            custom_name: rw.custom_name,
          })),
        }));
        setRooms(roomsData);
        setExistingRoomIds(project.rooms.map((r: any) => r.id));

        const materialsData: ProjectMaterial[] = project.materials.map((pm: any) => ({
          id: pm.id,
          material_id: pm.material,
          quantity: parseFloat(pm.quantity) || 0,
        }));
        setProjectMaterials(materialsData);
        setExistingMaterialIds(project.materials.map((m: any) => m.id));
      } catch (e: any) {
        toast({ title: "Error loading project", description: e.message, variant: "destructive" });
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
    if (parseInt(activeTab) === index && newRooms.length > 0) {
      setActiveTab("0");
    } else if (parseInt(activeTab) > index) {
      setActiveTab((parseInt(activeTab) - 1).toString());
    }
  };

  const updateRoom = (index: number, field: keyof Room, value: any) => {
    const newRooms = [...rooms];
    if (field === "room_type_id") {
      const roomTypeWorks = allWorks.filter((work) => work.room_type_ids.includes(value));
      newRooms[index] = {
        ...newRooms[index],
        [field]: value,
        name: generateRoomName(value, newRooms.filter((_, i) => i !== index)),
        works: roomTypeWorks.map((work) => ({
          work_id: work.id,
          is_selected: false,
          quantity: 0,
          custom_price_per_unit: null,
          custom_name: null,
        })),
      };
    } else {
      newRooms[index] = { ...newRooms[index], [field]: value };
      if (["opening_area", "wall_area", "floor_area", "perimeter"].includes(field as string)) {
        newRooms[index].works = newRooms[index].works.map((rw) => {
          const work = allWorks.find((w) => w.id === rw.work_id);
          if (work && rw.is_selected) {
            return { ...rw, quantity: calculateDefaultQuantity(work, newRooms[index]) };
          }
          return rw;
        });
      }
    }
    setRooms(newRooms);
  };

  const calculateDefaultQuantity = (work: Work, room: Room): number => {
    switch (work.calculation_base) {
      case "floor":
        return parseFloat(room.floor_area) || 0;
      case "wall":
        return (parseFloat(room.wall_area) || 0) - (parseFloat(room.opening_area) || 0);
      case "perimeter":
        return parseFloat(room.perimeter) || 0;
      default:
        return 1;
    }
  };

  const updateRoomWork = (
    roomIndex: number,
    workId: string,
    field: "is_selected" | "quantity" | "custom_price_per_unit" | "custom_name",
    value: any,
  ) => {
    const newRooms = [...rooms];
    let workIndex = newRooms[roomIndex].works.findIndex((w) => w.work_id === workId);

    if (workIndex === -1) {
      newRooms[roomIndex].works.push({
        work_id: workId,
        is_selected: false,
        quantity: 0,
        custom_price_per_unit: null,
        custom_name: null,
      });
      workIndex = newRooms[roomIndex].works.length - 1;
    }

    if (field === "is_selected" && value) {
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
          const effectivePrice = rw.custom_price_per_unit ?? work.price_per_unit * priceMultiplier;
          return sum + effectivePrice * rw.quantity;
        }
      }
      return sum;
    }, 0);
  };

  const calculateProjectTotal = (): number => {
    return rooms.reduce((sum, room) => sum + calculateRoomSubtotal(room), 0);
  };

  const calculateMaterialsTotal = (): number => {
    return projectMaterials.reduce((sum, pm) => {
      const material = allMaterials.find((m) => m.id === pm.material_id);
      return material ? sum + material.price_per_unit * pm.quantity : sum;
    }, 0);
  };

  const addMaterial = (materialId: string) => {
    if (projectMaterials.some((pm) => pm.material_id === materialId)) {
      toast({ title: "Material already added", variant: "destructive" });
      return;
    }
    setProjectMaterials([...projectMaterials, { material_id: materialId, quantity: 1 }]);
  };

  const updateMaterialQuantity = (materialId: string, quantity: number) => {
    setProjectMaterials(projectMaterials.map((pm) => (pm.material_id === materialId ? { ...pm, quantity } : pm)));
  };

  const removeMaterial = (materialId: string) => {
    setProjectMaterials(projectMaterials.filter((pm) => pm.material_id !== materialId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const projectPayload = {
        name: projectName,
        client: clientId,
        price_multiplier: priceMultiplier,
        discount: discount,
        discount_type: discountType,
        advance_payment_percentage: advancePaymentPercentage,
        timeline_categories: timelineCategories,
      };

      let projectId: string;

      if (id) {
        await api.patch(`/projects/${id}/`, projectPayload);
        projectId = id;

        // Delete existing rooms and materials
        await Promise.all([
          ...existingRoomIds.map((rid) => api.delete(`/project-rooms/${rid}/`)),
          ...existingMaterialIds.map((mid) => api.delete(`/project-materials/${mid}/`)),
        ]);
      } else {
        const { data: project } = await api.post("/projects/", projectPayload);
        projectId = project.id;
      }

      // Create rooms and their works
      for (const room of rooms) {
        const { data: newRoom } = await api.post("/project-rooms/", {
          project: projectId,
          name: room.name,
          room_type: room.room_type_id,
          opening_area: parseFloat(room.opening_area) || null,
          wall_area: parseFloat(room.wall_area) || null,
          floor_area: parseFloat(room.floor_area) || null,
          perimeter: parseFloat(room.perimeter) || null,
        });

        const selectedWorks = room.works.filter((w) => w.is_selected);
        for (const rw of selectedWorks) {
          await api.post("/project-room-works/", {
            project_room: newRoom.id,
            work: rw.work_id,
            is_selected: rw.is_selected,
            quantity: rw.quantity,
            custom_price_per_unit: rw.custom_price_per_unit,
            custom_name: rw.custom_name,
          });
        }
      }

      // Create project materials
      for (const pm of projectMaterials) {
        await api.post("/project-materials/", {
          project: projectId,
          material: pm.material_id,
          quantity: pm.quantity,
        });
      }

      toast({ title: "Success", description: id ? "Project updated successfully." : "Project created successfully." });

      if (!id) {
        navigate(`/dashboard/projects/${projectId}`);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getWorksForRoom = (room: Room): (Work & { roomWork?: RoomWork })[] => {
    if (!room.room_type_id) return [];
    const roomTypeWorks = allWorks.filter((work) => work.room_type_ids.includes(room.room_type_id));
    return roomTypeWorks.map((work) => ({
      ...work,
      roomWork: room.works.find((w) => w.work_id === work.id),
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString());
      const newIndex = parseInt(over.id.toString());
      setRooms(arrayMove(rooms, oldIndex, newIndex));
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

  const getCategoryName = (categoryId: string | null): string => {
    if (!categoryId) return "Uncategorized";
    return categories.find((c) => c.id === categoryId)?.name || "Uncategorized";
  };

  const getCategoryOrder = (categoryId: string | null): number => {
    if (!categoryId) return 999999;
    return categories.find((c) => c.id === categoryId)?.display_order ?? 999999;
  };

  const generatePDF = async () => {
    const doc = new jsPDF();

    const logoUrl = (profile as any)?.tenant?.logo_url || null;
    const companyDetails = (profile as any)?.tenant?.company_details || "";
    const bankDetails = (profile as any)?.tenant?.bank_details || "";

    const htmlToLines = (html: string): string[] => {
      if (!html) return [];
      let text = html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<\/li>/gi, "\n");
      text = text.replace(/<[^>]*>/g, "");
      const textarea = document.createElement("textarea");
      textarea.innerHTML = text;
      return textarea.value.split("\n").filter((line) => line.trim());
    };

    const client = clients.find((c) => c.id === clientId);
    const clientName = client?.full_name || "N/A";
    const quotationNumber = `#${id?.substring(0, 6).toUpperCase() || "000000"}`;
    const issuedDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const formatDate = (date: Date) =>
      date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

    doc.setFont("helvetica");
    doc.setFontSize(32);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.text("Quotation", 20, 25);

    if (logoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = logoUrl;
        });
        const fixedHeight = 20;
        const calculatedWidth = fixedHeight * (img.width / img.height);
        doc.addImage(img, "PNG", 190 - calculatedWidth, 10, calculatedWidth, fixedHeight);
      } catch (error) {
        console.error("Error loading logo:", error);
      }
    }

    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "normal");
    doc.text(quotationNumber, 20, 32);

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(20, 38, 190, 38);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "bold");
    doc.text("Project", 20, 48);
    doc.setFont("helvetica", "normal");
    doc.text(projectName, 20, 54);

    doc.setFont("helvetica", "bold");
    doc.text("Issued Date", 115, 48);
    doc.text("Due Date", 160, 48);
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(issuedDate), 115, 54);
    doc.text(formatDate(dueDate), 160, 54);

    doc.setFont("helvetica", "bold");
    doc.text("From", 20, 68);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const companyLines = htmlToLines(companyDetails);
    if (companyLines.length > 0) {
      let yPos = 74;
      companyLines.forEach((line) => {
        doc.text(line, 20, yPos);
        yPos += 5;
      });
    } else {
      doc.text("Company details not configured", 20, 74);
    }

    doc.setFont("helvetica", "bold");
    doc.text("To", 190, 68, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(clientName, 190, 74, { align: "right" });

    doc.setDrawColor(220, 220, 220);
    doc.line(20, 110, 190, 110);

    let yPosition = 120;

    for (const room of rooms) {
      const roomWorks = getWorksForRoom(room).filter((work) =>
        room.works.find((rw) => rw.work_id === work.id && rw.is_selected),
      );
      if (roomWorks.length === 0) continue;

      if (yPosition > 240) {
        doc.addPage();
        yPosition = 25;
      }

      doc.setFillColor(117, 201, 245);
      doc.rect(20, yPosition - 5, 170, 8, "F");
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.text(room.name, 22, yPosition);
      yPosition += 10;

      const groupedWorks = roomWorks.reduce(
        (acc, work) => {
          const catName = getCategoryName(work.category);
          const catOrder = getCategoryOrder(work.category);
          if (!acc[catName]) acc[catName] = { works: [], order: catOrder };
          acc[catName].works.push(work);
          return acc;
        },
        {} as Record<string, { works: typeof roomWorks; order: number }>,
      );

      const sortedCategories = Object.entries(groupedWorks).sort(([, a], [, b]) => a.order - b.order);

      for (const [categoryName, { works }] of sortedCategories) {
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 25;
        }

        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.setFont("helvetica", "bold");
        doc.text(categoryName, 20, yPosition);
        yPosition += 6;

        const tableData = works.map((work) => {
          const roomWork = room.works.find((rw) => rw.work_id === work.id);
          const quantity = roomWork?.quantity || 0;
          const pricePerUnit = roomWork?.custom_price_per_unit ?? work.price_per_unit * priceMultiplier;
          return [
            roomWork?.custom_name ?? work.name,
            quantity.toFixed(2),
            work.unit_type,
            `AED ${pricePerUnit.toFixed(2)}`,
            `AED ${(pricePerUnit * quantity).toFixed(2)}`,
          ];
        });

        autoTable(doc, {
          startY: yPosition,
          head: [["Description", "Units", "Type", "Price", "Amount"]],
          body: tableData,
          theme: "plain",
          headStyles: { fillColor: [250, 250, 250], textColor: [60, 60, 60], fontStyle: "bold", fontSize: 9, lineWidth: 0 },
          styles: { fontSize: 9, cellPadding: 3, font: "helvetica", textColor: [60, 60, 60] },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 20, halign: "right" },
            2: { cellWidth: 20, halign: "center" },
            3: { cellWidth: 25, halign: "right" },
            4: { cellWidth: 25, halign: "right" },
          },
          margin: { left: 20, right: 20 },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 6;
      }

      doc.setFillColor(250, 252, 255);
      doc.rect(120, yPosition - 2, 70, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      doc.text("Room Subtotal:", 125, yPosition + 2);
      doc.text(`AED ${calculateRoomSubtotal(room).toFixed(2)}`, 185, yPosition + 2, { align: "right" });
      yPosition += 12;
    }

    if (yPosition > 220) {
      doc.addPage();
      yPosition = 25;
    }

    yPosition += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "bold");
    doc.text("SUMMARY", 20, yPosition);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPosition + 2, 190, yPosition + 2);
    yPosition += 8;

    const roomsSummaryData = rooms
      .filter((room) => getWorksForRoom(room).some((w) => room.works.find((rw) => rw.work_id === w.id && rw.is_selected)))
      .map((room) => [room.name, `AED ${calculateRoomSubtotal(room).toFixed(2)}`]);

    if (roomsSummaryData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        body: roomsSummaryData,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 2, font: "helvetica", textColor: [70, 70, 70] },
        columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 40, halign: "right", fontStyle: "bold", textColor: [40, 40, 40] } },
        margin: { left: 20, right: 20 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 6;
    }

    if (yPosition > 230) {
      doc.addPage();
      yPosition = 25;
    }

    yPosition += 5;
    const subtotal = calculateProjectTotal();
    const discountAmount = discountType === "percentage" ? subtotal * (discount / 100) : discount;
    const afterDiscount = subtotal - discountAmount;
    const vat = afterDiscount * 0.05;
    const grandTotal = afterDiscount + vat;
    const advanceAmount = grandTotal * (advancePaymentPercentage / 100);
    const remainingPercentage = 100 - advancePaymentPercentage;

    const leftColumnX = 20;
    const leftColumnWidth = 90;
    const paymentTermsY = yPosition;

    doc.setFillColor(252, 252, 253);
    doc.roundedRect(leftColumnX, paymentTermsY, leftColumnWidth, 65, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text("Payment Terms", leftColumnX + 5, paymentTermsY + 8);

    let paymentY = paymentTermsY + 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);

    doc.setFont("helvetica", "bold");
    doc.text("•", leftColumnX + 5, paymentY);
    doc.text("Advance Payment:", leftColumnX + 8, paymentY);
    doc.setFont("helvetica", "normal");
    paymentY += 4;
    const advanceText = doc.splitTextToSize(
      `${advancePaymentPercentage}% of the total quotation amount is due within 3 business days from the date of signing the quotation or agreement.`,
      leftColumnWidth - 12,
    );
    doc.text(advanceText, leftColumnX + 8, paymentY);
    paymentY += advanceText.length * 4 + 3;

    doc.setFont("helvetica", "bold");
    doc.text("•", leftColumnX + 5, paymentY);
    doc.text("Progress Payments:", leftColumnX + 8, paymentY);
    doc.setFont("helvetica", "normal");
    paymentY += 4;
    const progressText = doc.splitTextToSize(
      `The remaining ${remainingPercentage}% shall be paid after completion and approval of the invoiced works as per the issued Certificate of Completion (CoC).`,
      leftColumnWidth - 12,
    );
    doc.text(progressText, leftColumnX + 8, paymentY);
    paymentY += progressText.length * 4 + 3;

    doc.setFont("helvetica", "bold");
    doc.text("•", leftColumnX + 5, paymentY);
    doc.text("Currency & Method:", leftColumnX + 8, paymentY);
    doc.setFont("helvetica", "normal");
    paymentY += 4;
    const currencyText = doc.splitTextToSize(
      "All payments must be made in United Arab Emirates Dirhams (AED) by bank transfer or cash deposit to the Contractor's designated account.",
      leftColumnWidth - 12,
    );
    doc.text(currencyText, leftColumnX + 8, paymentY);

    const rightColumnX = 115;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(rightColumnX, yPosition, 190, yPosition);
    yPosition += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("Subtotal:", rightColumnX + 5, yPosition);
    doc.text(`AED ${subtotal.toFixed(2)}`, 185, yPosition, { align: "right" });
    yPosition += 7;

    if (discount > 0) {
      doc.text(`Discount${discountType === "percentage" ? ` (${discount}%)` : ""}:`, rightColumnX + 5, yPosition);
      doc.text(`-AED ${discountAmount.toFixed(2)}`, 185, yPosition, { align: "right" });
      yPosition += 7;
    }

    doc.text("VAT (5%):", rightColumnX + 5, yPosition);
    doc.text(`AED ${vat.toFixed(2)}`, 185, yPosition, { align: "right" });
    yPosition += 10;

    doc.setFillColor(245, 247, 250);
    doc.rect(rightColumnX, yPosition - 5, 75, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 20);
    doc.text("Total Amount:", rightColumnX + 5, yPosition + 2);
    doc.text(`AED ${grandTotal.toFixed(2)}`, 185, yPosition + 2, { align: "right" });
    yPosition += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Advance (${advancePaymentPercentage}%):`, rightColumnX + 5, yPosition);
    doc.text(`AED ${advanceAmount.toFixed(2)}`, 185, yPosition, { align: "right" });
    yPosition += 5;
    doc.text(`Balance (${remainingPercentage}%):`, rightColumnX + 5, yPosition);
    doc.text(`AED ${(grandTotal - advanceAmount).toFixed(2)}`, 185, yPosition, { align: "right" });

    const summaryEndY = yPosition;
    const paymentTermsEndY = paymentTermsY + 65;
    yPosition = Math.max(summaryEndY, paymentTermsEndY) + 18;

    if (timelineCategories.length > 0) {
      if (yPosition > 180) {
        doc.addPage();
        yPosition = 25;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Project Timeline", 20, yPosition);
      yPosition += 10;

      const totalDays = timelineCategories.reduce((sum, cat) => sum + cat.days, 0);
      let cumulativeDays = 0;
      const chartStartX = 20;
      const chartWidth = 170;
      const barHeight = 12;
      const spacing = 4;
      const labelWidth = 65;
      const chartAreaWidth = chartWidth - labelWidth;

      const colors = [
        [59, 130, 246],
        [34, 197, 94],
        [249, 115, 22],
        [168, 85, 247],
        [236, 72, 153],
      ];

      timelineCategories.forEach((phase, index) => {
        if (yPosition + barHeight + spacing > 270) {
          doc.addPage();
          yPosition = 25;
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text("Project Timeline (continued)", 20, yPosition);
          yPosition += 10;
        }

        const startDate = new Date(issuedDate);
        startDate.setDate(startDate.getDate() + cumulativeDays);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + phase.days - 1);

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(50, 50, 50);
        doc.text(phase.name, chartStartX, yPosition + 4);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`${formatDate(startDate)} - ${formatDate(endDate)}`, chartStartX, yPosition + 9);

        const barStartX = chartStartX + labelWidth;
        const barWidth = (phase.days / totalDays) * chartAreaWidth;

        doc.setFillColor(240, 242, 245);
        doc.roundedRect(barStartX, yPosition, chartAreaWidth, barHeight, 1, 1, "F");

        const color = colors[index % colors.length];
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(barStartX, yPosition, barWidth, barHeight, 1, 1, "F");

        const daysText = `${phase.days} ${phase.days === 1 ? "day" : "days"}`;
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        const textWidth = doc.getTextWidth(daysText);
        if (barWidth > textWidth + 4) {
          doc.text(daysText, barStartX + barWidth / 2, yPosition + 7.5, { align: "center" });
        } else {
          doc.setTextColor(80, 80, 80);
          doc.text(daysText, barStartX + barWidth + 2, yPosition + 7.5);
        }

        yPosition += barHeight + spacing;
        cumulativeDays += phase.days;
      });

      yPosition += 4;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(chartStartX, yPosition, chartWidth, 10, 2, 2, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Total Project Duration:", chartStartX + 5, yPosition + 6.5);
      doc.text(`${totalDays} business days`, chartStartX + chartWidth - 5, yPosition + 6.5, { align: "right" });
      yPosition += 18;
    }

    if (yPosition > 250) {
      doc.addPage();
      yPosition = 25;
    }

    doc.setFillColor(252, 252, 253);
    doc.roundedRect(20, yPosition, 170, 35, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 70, 70);
    doc.text("Note: All furniture, decor and design solutions will be made in accordance with the client's budget.", 23, yPosition + 5);
    doc.text("The prices (including custom made furniture) may be adjusted after finishing the design project or", 23, yPosition + 10);
    doc.text("during work execution or after final decision on the finishing materials and accessories.", 23, yPosition + 15);
    doc.text("The validity period for this estimate is 30 days.", 23, yPosition + 20);
    yPosition += 43;

    if (yPosition > 200) {
      doc.addPage();
      yPosition = 25;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text("Bank Details", 20, yPosition);
    yPosition += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    const bankLines = htmlToLines(bankDetails);
    if (bankLines.length > 0) {
      bankLines.forEach((line) => {
        doc.text(line, 20, yPosition);
        yPosition += 5;
      });
    } else {
      doc.text("Bank details not configured", 20, yPosition);
      yPosition += 5;
    }

    const signatureY = yPosition - 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Authorized Signature", 190, signatureY, { align: "right" });
    doc.setDrawColor(180, 180, 180);
    doc.line(130, signatureY + 20, 190, signatureY + 20);

    if (projectMaterials.length > 0) {
      yPosition = signatureY + 35;
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 25;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Preliminary Materials Cost", 20, yPosition);
      yPosition += 10;

      const materialsData = projectMaterials
        .map((pm) => {
          const material = allMaterials.find((m) => m.id === pm.material_id);
          if (!material) return null;
          return [
            material.name,
            material.unit_type,
            `AED ${Number(material.price_per_unit).toFixed(2)}`,
            pm.quantity.toFixed(2),
            `AED ${(Number(material.price_per_unit) * pm.quantity).toFixed(2)}`,
          ];
        })
        .filter(Boolean);

      autoTable(doc, {
        startY: yPosition,
        head: [["Material", "Unit", "Price/Unit", "Quantity", "Total"]],
        body: materialsData as any,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 10 },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 20, halign: "center" }, 2: { cellWidth: 30, halign: "right" }, 3: { cellWidth: 30, halign: "right" }, 4: { cellWidth: 35, halign: "right" } },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 8;
      const materialsTotal = calculateMaterialsTotal();
      doc.setFillColor(245, 247, 250);
      doc.rect(120, yPosition, 70, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.text("Materials Total:", 125, yPosition + 6.5);
      doc.text(`AED ${materialsTotal.toFixed(2)}`, 185, yPosition + 6.5, { align: "right" });
      yPosition += 18;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("Note: Materials cost is preliminary and subject to change based on final selection and availability.", 20, yPosition);
    }

    doc.save(`Quotation_${quotationNumber}_${projectName.replace(/[^a-z0-9]/gi, "_")}.pdf`);
    toast({ title: "PDF Generated", description: "Your quotation has been downloaded successfully." });
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
              <SortableContext items={rooms.map((_, index) => index.toString())} strategy={horizontalListSortingStrategy}>
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
                          <Input type="number" step="0.01" value={room.wall_area} onChange={(e) => updateRoom(roomIndex, "wall_area", e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Opening Area (m²)</Label>
                          <Input type="number" step="0.01" value={room.opening_area} onChange={(e) => updateRoom(roomIndex, "opening_area", e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Floor Area (m²)</Label>
                          <Input type="number" step="0.01" value={room.floor_area} onChange={(e) => updateRoom(roomIndex, "floor_area", e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Perimeter (m)</Label>
                          <Input type="number" step="0.01" value={room.perimeter} onChange={(e) => updateRoom(roomIndex, "perimeter", e.target.value)} />
                        </div>
                      </div>

                      {room.room_type_id && getWorksForRoom(room).length > 0 && (
                        <div className="space-y-2">
                          <Label>Works</Label>
                          <Accordion type="multiple" className="w-full space-y-2">
                            {(() => {
                              const worksForRoom = getWorksForRoom(room);
                              const groupedWorks = worksForRoom.reduce(
                                (acc, work) => {
                                  const catName = getCategoryName(work.category);
                                  const catOrder = getCategoryOrder(work.category);
                                  if (!acc[catName]) acc[catName] = { works: [], order: catOrder };
                                  acc[catName].works.push(work);
                                  return acc;
                                },
                                {} as Record<string, { works: typeof worksForRoom; order: number }>,
                              );

                              return Object.entries(groupedWorks)
                                .sort(([, a], [, b]) => a.order - b.order)
                                .map(([categoryName, { works }]) => (
                                  <AccordionItem key={categoryName} value={categoryName} className="border rounded-lg">
                                    <AccordionTrigger className="hover:no-underline px-4 py-2">
                                      <span className="font-semibold text-sm">{categoryName}</span>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                      <div className="border rounded-lg overflow-hidden">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="w-[50px]">Select</TableHead>
                                              <TableHead>Work</TableHead>
                                              <TableHead>Base Price</TableHead>
                                              <TableHead>Custom Price</TableHead>
                                              <TableHead>Unit</TableHead>
                                              <TableHead>Quantity</TableHead>
                                              <TableHead>Subtotal</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {works.map((work) => {
                                              const roomWork = work.roomWork || {
                                                work_id: work.id,
                                                is_selected: false,
                                                quantity: 0,
                                                custom_price_per_unit: null,
                                                custom_name: null,
                                              };
                                              const effectivePrice = roomWork.custom_price_per_unit ?? work.price_per_unit * priceMultiplier;
                                              return (
                                                <TableRow key={work.id}>
                                                  <TableCell>
                                                    <Checkbox
                                                      checked={roomWork.is_selected}
                                                      onCheckedChange={(checked) => updateRoomWork(roomIndex, work.id, "is_selected", checked)}
                                                    />
                                                  </TableCell>
                                                  <TableCell>
                                                    <Input
                                                      type="text"
                                                      value={roomWork.custom_name ?? work.name}
                                                      onChange={(e) => updateRoomWork(roomIndex, work.id, "custom_name", e.target.value || null)}
                                                      className="w-full"
                                                      placeholder={work.name}
                                                    />
                                                  </TableCell>
                                                  <TableCell>
                                                    <span className="text-muted-foreground text-sm">
                                                      AED {(work.price_per_unit * priceMultiplier).toFixed(2)}
                                                    </span>
                                                  </TableCell>
                                                  <TableCell>
                                                    <Input
                                                      type="number"
                                                      step="0.01"
                                                      placeholder="Override"
                                                      value={roomWork.custom_price_per_unit ?? ""}
                                                      onChange={(e) => updateRoomWork(roomIndex, work.id, "custom_price_per_unit", e.target.value ? parseFloat(e.target.value) : null)}
                                                      disabled={!roomWork.is_selected}
                                                      className="w-28"
                                                    />
                                                  </TableCell>
                                                  <TableCell>{work.unit_type}</TableCell>
                                                  <TableCell>
                                                    <div className="flex items-center gap-2">
                                                      <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={roomWork.quantity}
                                                        onChange={(e) => updateRoomWork(roomIndex, work.id, "quantity", parseFloat(e.target.value) || 0)}
                                                        disabled={!roomWork.is_selected}
                                                        className="w-24"
                                                      />
                                                      <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => updateRoomWork(roomIndex, work.id, "quantity", calculateDefaultQuantity(work, room))}
                                                        disabled={!roomWork.is_selected}
                                                        className="h-10 w-10"
                                                      >
                                                        <Calculator className="h-4 w-4" />
                                                      </Button>
                                                    </div>
                                                  </TableCell>
                                                  <TableCell>AED {(effectivePrice * roomWork.quantity).toFixed(2)}</TableCell>
                                                </TableRow>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                ));
                            })()}
                          </Accordion>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="advancePayment">Advance Payment (%)</Label>
                <Input
                  id="advancePayment"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={advancePaymentPercentage}
                  onChange={(e) => setAdvancePaymentPercentage(parseFloat(e.target.value) || 0)}
                />
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
                  const s = calculateProjectTotal();
                  const d = discountType === "percentage" ? s * (discount / 100) : discount;
                  return (s - d).toFixed(2);
                })()}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span>VAT (5%):</span>
                <span>AED {(() => {
                  const s = calculateProjectTotal();
                  const d = discountType === "percentage" ? s * (discount / 100) : discount;
                  return ((s - d) * 0.05).toFixed(2);
                })()}</span>
              </div>
              <div className="flex justify-between items-center text-2xl font-bold pt-2 border-t">
                <span>Grand Total:</span>
                <span>AED {(() => {
                  const s = calculateProjectTotal();
                  const d = discountType === "percentage" ? s * (discount / 100) : discount;
                  return ((s - d) * 1.05).toFixed(2);
                })()}</span>
              </div>
              <div className="flex justify-between items-center text-lg text-muted-foreground pt-2">
                <span>Advance Payment ({advancePaymentPercentage}%):</span>
                <span>AED {(() => {
                  const s = calculateProjectTotal();
                  const d = discountType === "percentage" ? s * (discount / 100) : discount;
                  return ((s - d) * 1.05 * (advancePaymentPercentage / 100)).toFixed(2);
                })()}</span>
              </div>
              <div className="flex justify-between items-center text-lg text-muted-foreground">
                <span>Remaining ({100 - advancePaymentPercentage}%):</span>
                <span>AED {(() => {
                  const s = calculateProjectTotal();
                  const d = discountType === "percentage" ? s * (discount / 100) : discount;
                  return ((s - d) * 1.05 * ((100 - advancePaymentPercentage) / 100)).toFixed(2);
                })()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Materials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Add Material</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="mr-2 h-4 w-4" />
                    Search and add materials
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search materials..." />
                    <CommandEmpty>No materials found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {allMaterials
                          .filter((m) => !projectMaterials.some((pm) => pm.material_id === m.id))
                          .map((material) => (
                            <CommandItem key={material.id} onSelect={() => addMaterial(material.id)}>
                              <div className="flex justify-between w-full">
                                <span>{material.name}</span>
                                <span className="text-muted-foreground">
                                  AED {Number(material.price_per_unit).toFixed(2)}/{material.unit_type}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {projectMaterials.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Unit Type</TableHead>
                      <TableHead>Price/Unit</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectMaterials.map((pm) => {
                      const material = allMaterials.find((m) => m.id === pm.material_id);
                      if (!material) return null;
                      return (
                        <TableRow key={pm.material_id}>
                          <TableCell>{material.name}</TableCell>
                          <TableCell>{material.unit_type}</TableCell>
                          <TableCell>AED {Number(material.price_per_unit).toFixed(2)}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={pm.quantity}
                              onChange={(e) => updateMaterialQuantity(pm.material_id, parseFloat(e.target.value) || 0)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            AED {(Number(material.price_per_unit) * pm.quantity).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeMaterial(pm.material_id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {projectMaterials.length > 0 && (
              <div className="flex justify-between items-center text-xl font-bold pt-4 border-t">
                <span>Preliminary Materials Total:</span>
                <span>AED {calculateMaterialsTotal().toFixed(2)}</span>
              </div>
            )}

            {projectMaterials.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No materials added yet. Add materials to show preliminary cost.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTimelineDragEnd}>
              <SortableContext items={timelineCategories.map((cat) => cat.id)} strategy={verticalListSortingStrategy}>
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
                      onDelete={() => setTimelineCategories(timelineCategories.filter((_, i) => i !== index))}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <Button
              type="button"
              variant="outline"
              onClick={() => setTimelineCategories([...timelineCategories, { id: crypto.randomUUID(), name: "New Phase", days: 1 }])}
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

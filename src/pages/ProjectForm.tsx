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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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

interface Category {
  id: string;
  name: string;
}

interface Work {
  id: string;
  name: string;
  price_per_unit: number;
  unit_type: string;
  calculation_base: string;
  category_id: string | null;
  categories?: Category;
  work_room_types?: Array<{ room_type_id: string }>;
}

interface RoomWork {
  work_id: string;
  is_selected: boolean;
  quantity: number;
  custom_price_per_unit?: number | null;
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
  const [advancePaymentPercentage, setAdvancePaymentPercentage] = useState<number>(30);
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
      supabase.from("works").select("*, work_room_types(room_type_id), categories(id, name)"),
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
        setAdvancePaymentPercentage(project.advance_payment_percentage || 30);
        setTimelineCategories((project.timeline_categories as Array<{ id: string; name: string; days: number }>) || []);

        const { data: projectRooms } = await supabase
          .from("project_rooms")
          .select(
            `
            *,
            room_types(id, name),
            project_room_works(work_id, is_selected, quantity, custom_price_per_unit)
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
                custom_price_per_unit: w.custom_price_per_unit,
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
          custom_price_per_unit: null,
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

  const updateRoomWork = (roomIndex: number, workId: string, field: "is_selected" | "quantity" | "custom_price_per_unit", value: any) => {
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
          const effectivePrice = rw.custom_price_per_unit ?? (work.price_per_unit * priceMultiplier);
          return sum + effectivePrice * rw.quantity;
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
            advance_payment_percentage: advancePaymentPercentage,
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
            advance_payment_percentage: advancePaymentPercentage,
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
              custom_price_per_unit: w.custom_price_per_unit,
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
            custom_price_per_unit: w.custom_price_per_unit,
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
    
    // Get tenant logo
    const { data: profileData } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", user?.id)
      .single();

    let logoUrl = null;
    if (profileData?.tenant_id) {
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("logo_url")
        .eq("id", profileData.tenant_id)
        .single();
      logoUrl = tenantData?.logo_url;
    }
    
    // Get client details
    const client = clients.find(c => c.id === clientId);
    const clientName = client?.full_name || "N/A";
    
    // Generate quotation number based on project ID
    const quotationNumber = `#${id?.substring(0, 6).toUpperCase() || '000000'}`;
    
    // Calculate dates
    const issuedDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };
    
    // Set elegant business font
    doc.setFont("helvetica");
    
    // === PAGE 1: HEADER & INFO ===
    
    // Header - Quotation title
    doc.setFontSize(32);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.text("Quotation", 20, 25);
    
    // Company logo on right (fixed height, auto width)
    if (logoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = logoUrl;
        });
        
        // Fixed height of 20mm, calculate width based on aspect ratio
        const fixedHeight = 20;
        const aspectRatio = img.width / img.height;
        const calculatedWidth = fixedHeight * aspectRatio;
        
        // Position from right edge
        doc.addImage(img, 'PNG', 190 - calculatedWidth, 10, calculatedWidth, fixedHeight);
      } catch (error) {
        console.error("Error loading logo:", error);
      }
    }
    
    // Quotation number
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "normal");
    doc.text(quotationNumber, 20, 32);
    
    // Horizontal line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(20, 38, 190, 38);
    
    // Project name
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "bold");
    doc.text("Project", 20, 48);
    doc.setFont("helvetica", "normal");
    doc.text(projectName, 20, 54);
    
    // Dates section
    doc.setFont("helvetica", "bold");
    doc.text("Issued Date", 115, 48);
    doc.text("Due Date", 160, 48);
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(issuedDate), 115, 54);
    doc.text(formatDate(dueDate), 160, 54);
    
    // From section - Company Details
    doc.setFont("helvetica", "bold");
    doc.text("From", 20, 68);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Elite Interiors LLC", 20, 74);
    doc.text("Business Bay, Dubai, UAE", 20, 79);
    doc.text("License No: 123456", 20, 84);
    doc.text("Registration No: 789012", 20, 89);
    doc.text("Phone: +971 4 123 4567", 20, 94);
    doc.text("Email: info@eliteinteriors.ae", 20, 99);
    
    // To section (right aligned)
    doc.setFont("helvetica", "bold");
    doc.text("To", 190, 68, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(clientName, 190, 74, { align: "right" });
    
    // Horizontal line before items
    doc.setDrawColor(220, 220, 220);
    doc.line(20, 110, 190, 110);
    
    let yPosition = 120;
    
    // === ITEMS SECTION ===
    
    // Rooms and Works with improved formatting
    for (const room of rooms) {
      const roomType = roomTypes.find(rt => rt.id === room.room_type_id);
      const roomWorks = getWorksForRoom(room).filter(work => 
        room.works.find(rw => rw.work_id === work.id && rw.is_selected)
      );
      
      if (roomWorks.length === 0) continue;
      
      // Check if we need a new page
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 25;
      }
      
      // Room header with background
      doc.setFillColor(245, 247, 250);
      doc.rect(20, yPosition - 5, 170, 8, 'F');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.text(`${room.name} (${roomType?.name || "Unknown"})`, 22, yPosition);
      yPosition += 10;
      
      // Works table with clean design
      const tableData = roomWorks.map(work => {
        const roomWork = room.works.find(rw => rw.work_id === work.id);
        const quantity = roomWork?.quantity || 0;
        const pricePerUnit = work.price_per_unit * priceMultiplier;
        const total = pricePerUnit * quantity;
        
        return [
          work.name,
          quantity.toFixed(2),
          work.unit_type,
          `AED ${pricePerUnit.toFixed(2)}`,
          `AED ${total.toFixed(2)}`
        ];
      });
      
      autoTable(doc, {
        startY: yPosition,
        head: [["Description", "Units", "Type", "Price", "Amount"]],
        body: tableData,
        theme: "plain",
        headStyles: { 
          fillColor: [250, 250, 250],
          textColor: [60, 60, 60],
          fontStyle: "bold",
          fontSize: 9,
          lineWidth: 0,
          lineColor: [220, 220, 220]
        },
        styles: { 
          fontSize: 9,
          cellPadding: 3,
          font: "helvetica",
          textColor: [60, 60, 60]
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 20, halign: "right" },
          2: { cellWidth: 20, halign: "center" },
          3: { cellWidth: 25, halign: "right" },
          4: { cellWidth: 25, halign: "right" }
        },
        margin: { left: 20, right: 20 },
        didDrawCell: (data) => {
          // Add subtle borders
          if (data.section === 'body') {
            doc.setDrawColor(240, 240, 240);
            doc.setLineWidth(0.1);
          }
        }
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 3;
      
      // Room subtotal with light background
      doc.setFillColor(250, 252, 255);
      doc.rect(120, yPosition - 2, 70, 7, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      const roomSubtotal = calculateRoomSubtotal(room);
      doc.text("Room Subtotal:", 125, yPosition + 2);
      doc.text(`AED ${roomSubtotal.toFixed(2)}`, 185, yPosition + 2, { align: "right" });
      yPosition += 12;
    }
    
    // === FINANCIAL SUMMARY ===
    
    // Add new page if needed for summary
    if (yPosition > 230) {
      doc.addPage();
      yPosition = 25;
    }
    
    yPosition += 5;
    
    const subtotal = calculateProjectTotal();
    const discountAmount = discountType === "percentage" 
      ? subtotal * (discount / 100)
      : discount;
    const afterDiscount = subtotal - discountAmount;
    const vat = afterDiscount * 0.05;
    const grandTotal = afterDiscount + vat;
    const advanceAmount = grandTotal * (advancePaymentPercentage / 100);
    const remainingPercentage = 100 - advancePaymentPercentage;
    
    // === PAYMENT TERMS (Left side) ===
    const leftColumnX = 20;
    const leftColumnWidth = 90;
    const paymentTermsY = yPosition;
    
    // Payment Terms Box
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(leftColumnX, paymentTermsY, leftColumnWidth, 65, 2, 2, 'F');
    
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text("Payment Terms", leftColumnX + 5, paymentTermsY + 8);
    
    let paymentY = paymentTermsY + 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    
    // Bullet 1: Advance Payment
    doc.setFont("helvetica", "bold");
    doc.text("•", leftColumnX + 5, paymentY);
    doc.text("Advance Payment:", leftColumnX + 8, paymentY);
    doc.setFont("helvetica", "normal");
    paymentY += 4;
    const advanceText = doc.splitTextToSize(
      `${advancePaymentPercentage}% of the total quotation amount is due within 3 business days from the date of signing the quotation or agreement.`,
      leftColumnWidth - 12
    );
    doc.text(advanceText, leftColumnX + 8, paymentY);
    paymentY += advanceText.length * 4 + 3;
    
    // Bullet 2: Progress Payments
    doc.setFont("helvetica", "bold");
    doc.text("•", leftColumnX + 5, paymentY);
    doc.text("Progress Payments:", leftColumnX + 8, paymentY);
    doc.setFont("helvetica", "normal");
    paymentY += 4;
    const progressText = doc.splitTextToSize(
      `The remaining ${remainingPercentage}% shall be paid after completion and approval of the invoiced works as per the issued Certificate of Completion (CoC).`,
      leftColumnWidth - 12
    );
    doc.text(progressText, leftColumnX + 8, paymentY);
    paymentY += progressText.length * 4 + 3;
    
    // Bullet 3: Currency & Method
    doc.setFont("helvetica", "bold");
    doc.text("•", leftColumnX + 5, paymentY);
    doc.text("Currency & Method:", leftColumnX + 8, paymentY);
    doc.setFont("helvetica", "normal");
    paymentY += 4;
    const currencyText = doc.splitTextToSize(
      "All payments must be made in United Arab Emirates Dirhams (AED) by bank transfer or cash deposit to the Contractor's designated account.",
      leftColumnWidth - 12
    );
    doc.text(currencyText, leftColumnX + 8, paymentY);
    
    // Summary box (Right side)
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
    
    // Grand total with background
    doc.setFillColor(245, 247, 250);
    doc.rect(rightColumnX, yPosition - 5, 75, 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 20);
    doc.text("Total Amount:", rightColumnX + 5, yPosition + 2);
    doc.text(`AED ${grandTotal.toFixed(2)}`, 185, yPosition + 2, { align: "right" });
    yPosition += 10;
    
    // Advance payment amount
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Advance (${advancePaymentPercentage}%):`, rightColumnX + 5, yPosition);
    doc.text(`AED ${advanceAmount.toFixed(2)}`, 185, yPosition, { align: "right" });
    yPosition += 5;
    
    doc.text(`Balance (${remainingPercentage}%):`, rightColumnX + 5, yPosition);
    doc.text(`AED ${(grandTotal - advanceAmount).toFixed(2)}`, 185, yPosition, { align: "right" });
    
    // Ensure timeline starts after payment terms box (which is 65 units tall)
    const summaryEndY = yPosition;
    const paymentTermsEndY = paymentTermsY + 65;
    yPosition = Math.max(summaryEndY, paymentTermsEndY) + 18;
    
    // === PROJECT TIMELINE ===
    if (timelineCategories.length > 0) {
      // Add new page for timeline if needed
      if (yPosition > 180) {
        doc.addPage();
        yPosition = 25;
      }
      
      // Timeline title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Project Timeline", 20, yPosition);
      yPosition += 10;
      
      // Calculate total duration and dates
      const totalDays = timelineCategories.reduce((sum, cat) => sum + cat.days, 0);
      let cumulativeDays = 0;
      
      // Chart dimensions
      const chartStartX = 20;
      const chartWidth = 170;
      const barHeight = 12;
      const spacing = 4;
      const labelWidth = 65;
      const chartAreaWidth = chartWidth - labelWidth;
      
      // Draw each phase
      timelineCategories.forEach((phase, index) => {
        // Check if we need a new page
        if (yPosition + barHeight + spacing > 270) {
          doc.addPage();
          yPosition = 25;
          
          // Redraw title on new page
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text("Project Timeline (continued)", 20, yPosition);
          yPosition += 10;
        }
        
        // Calculate dates for this phase
        const startDate = new Date(issuedDate);
        startDate.setDate(startDate.getDate() + cumulativeDays);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + phase.days - 1);
        
        // Phase name and dates
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(50, 50, 50);
        doc.text(phase.name, chartStartX, yPosition + 4);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`${formatDate(startDate)} - ${formatDate(endDate)}`, chartStartX, yPosition + 9);
        
        // Timeline bar
        const barStartX = chartStartX + labelWidth;
        const barWidth = (phase.days / totalDays) * chartAreaWidth;
        
        // Draw bar background
        doc.setFillColor(240, 242, 245);
        doc.roundedRect(barStartX, yPosition, chartAreaWidth, barHeight, 1, 1, 'F');
        
        // Draw progress bar with gradient-like effect
        const hue = (index * 60) % 360;
        const colors = [
          [59, 130, 246],   // Blue
          [34, 197, 94],    // Green
          [249, 115, 22],   // Orange
          [168, 85, 247],   // Purple
          [236, 72, 153],   // Pink
        ];
        const color = colors[index % colors.length];
        
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(barStartX, yPosition, barWidth, barHeight, 1, 1, 'F');
        
        // Add days label on the bar
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        const daysText = `${phase.days} ${phase.days === 1 ? 'day' : 'days'}`;
        const textWidth = doc.getTextWidth(daysText);
        
        // Only show text if bar is wide enough
        if (barWidth > textWidth + 4) {
          doc.text(daysText, barStartX + barWidth / 2, yPosition + 7.5, { align: 'center' });
        } else {
          // Show days outside the bar if too narrow
          doc.setTextColor(80, 80, 80);
          doc.text(daysText, barStartX + barWidth + 2, yPosition + 7.5);
        }
        
        yPosition += barHeight + spacing;
        cumulativeDays += phase.days;
      });
      
      // Total duration summary
      yPosition += 4;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(chartStartX, yPosition, chartWidth, 10, 2, 2, 'F');
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Total Project Duration:", chartStartX + 5, yPosition + 6.5);
      doc.text(`${totalDays} business days`, chartStartX + chartWidth - 5, yPosition + 6.5, { align: 'right' });
      
      yPosition += 18;
    }
    
    // === NOTES SECTION ===
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 25;
    }
    
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(20, yPosition, 170, 35, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 70, 70);
    doc.text("Note: All furniture, decor and design solutions will be made in accordance with the client's budget.", 23, yPosition + 5);
    doc.text("The prices (including custom made furniture) may be adjusted after finishing the design project or", 23, yPosition + 10);
    doc.text("during work execution or after final decision on the finishing materials and accessories.", 23, yPosition + 15);
    doc.text("The validity period for this estimate is 30 days.", 23, yPosition + 20);
    
    yPosition += 43;
    
    // === PAYMENT METHOD & SIGNATURE ===
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 25;
    }
    
    // Bank Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text("Bank Details", 20, yPosition);
    yPosition += 7;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    doc.text("Account Holder: Elite Interiors LLC", 20, yPosition);
    yPosition += 5;
    doc.text("Bank Name: Emirates NBD", 20, yPosition);
    yPosition += 5;
    doc.text("Account Number: 1234567890123", 20, yPosition);
    yPosition += 5;
    doc.text("IBAN: AE07 0331 2345 6789 0123 456", 20, yPosition);
    
    // Signature area (right side)
    const signatureY = yPosition - 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Authorized Signature", 190, signatureY, { align: "right" });
    
    // Signature line
    doc.setDrawColor(180, 180, 180);
    doc.line(130, signatureY + 20, 190, signatureY + 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(user?.email?.split('@')[0] || "Authorized Person", 190, signatureY + 25, { align: "right" });
    
    // Save PDF
    doc.save(`Quotation_${quotationNumber}_${projectName.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    
    toast({
      title: "PDF Generated",
      description: "Your quotation has been downloaded successfully.",
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
                          <Accordion type="multiple" className="w-full space-y-2">
                            {(() => {
                              const worksForRoom = getWorksForRoom(room);
                              const groupedWorks = worksForRoom.reduce((acc, work) => {
                                const categoryName = work.categories?.name || "Uncategorized";
                                if (!acc[categoryName]) {
                                  acc[categoryName] = [];
                                }
                                acc[categoryName].push(work);
                                return acc;
                              }, {} as Record<string, typeof worksForRoom>);

                              return Object.entries(groupedWorks).map(([categoryName, works]) => {
                                const selectedCount = works.filter(work => {
                                  const roomWork = work.roomWork || {
                                    work_id: work.id,
                                    is_selected: false,
                                    quantity: 0,
                                    custom_price_per_unit: null,
                                  };
                                  return roomWork.is_selected;
                                }).length;

                                return (
                                  <AccordionItem key={categoryName} value={categoryName} className="border rounded-lg">
                                    <AccordionTrigger className="hover:no-underline px-4 py-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm">{categoryName}</span>
                                        {selectedCount > 0 && (
                                          <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full">
                                            {selectedCount}
                                          </span>
                                        )}
                                      </div>
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
                                            };
                                            const effectivePrice = roomWork.custom_price_per_unit ?? (work.price_per_unit * priceMultiplier);
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
                                                    onChange={(e) =>
                                                      updateRoomWork(
                                                        roomIndex,
                                                        work.id,
                                                        "custom_price_per_unit",
                                                        e.target.value ? parseFloat(e.target.value) : null,
                                                      )
                                                    }
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
                                                <TableCell>AED {(effectivePrice * roomWork.quantity).toFixed(2)}</TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                     </div>
                                   </AccordionContent>
                                 </AccordionItem>
                                );
                              });
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
              <div className="flex justify-between items-center text-lg text-muted-foreground pt-2">
                <span>Advance Payment ({advancePaymentPercentage}%):</span>
                <span>AED {(() => {
                  const subtotal = calculateProjectTotal();
                  const discountAmount = discountType === "percentage" 
                    ? subtotal * (discount / 100)
                    : discount;
                  const grandTotal = (subtotal - discountAmount) * 1.05;
                  return (grandTotal * (advancePaymentPercentage / 100)).toFixed(2);
                })()}</span>
              </div>
              <div className="flex justify-between items-center text-lg text-muted-foreground">
                <span>Remaining ({100 - advancePaymentPercentage}%):</span>
                <span>AED {(() => {
                  const subtotal = calculateProjectTotal();
                  const discountAmount = discountType === "percentage" 
                    ? subtotal * (discount / 100)
                    : discount;
                  const grandTotal = (subtotal - discountAmount) * 1.05;
                  return (grandTotal * ((100 - advancePaymentPercentage) / 100)).toFixed(2);
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

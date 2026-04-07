import { useState, useEffect } from "react";
import api from "@/api/client";
import { Button } from "@/components/ui/button";
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
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableCategory } from "@/components/SortableCategory";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Tag, Search, Upload, Download, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface Category {
  id: string;
  name: string;
  display_order?: number;
}

interface RoomType {
  id: string;
  name: string;
}

interface Work {
  id: string;
  category: string | null;
  name: string;
  description: string | null;
  unit_type: string;
  price_per_unit: number;
  calculation_base: string | null;
  display_order?: number;
  room_type_ids?: string[];
}

const Works = () => {
  const { toast } = useToast();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );
  const [works, setWorks] = useState<Work[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [open, setOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [roomTypeOpen, setRoomTypeOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<Work | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newRoomType, setNewRoomType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    unit_type: "m2",
    price_per_unit: "",
    category: "",
    calculation_base: "none",
    room_type_ids: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [worksRes, categoriesRes, roomTypesRes] = await Promise.all([
        api.get("/works/"),
        api.get("/categories/"),
        api.get("/room-types/"),
      ]);
      setWorks(worksRes.data.results ?? worksRes.data);
      setCategories(categoriesRes.data.results ?? categoriesRes.data);
      setRoomTypes(roomTypesRes.data.results ?? roomTypesRes.data);
    } catch (e: any) {
      toast({ title: "Error loading data", description: e.message, variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const workData = {
      name: formData.name,
      description: formData.description || null,
      unit_type: formData.unit_type,
      price_per_unit: parseFloat(formData.price_per_unit),
      category: formData.category || null,
      calculation_base: formData.calculation_base === "none" ? null : formData.calculation_base,
    };

    try {
      let workId: string;
      if (editingWork) {
        await api.patch(`/works/${editingWork.id}/`, workData);
        workId = editingWork.id;
        toast({ title: "Work updated successfully" });
      } else {
        const { data } = await api.post("/works/", workData);
        workId = data.id;
        toast({ title: "Work created successfully" });
      }

      await api.post(`/works/${workId}/room-types/`, { room_type_ids: formData.room_type_ids });

      loadData();
      handleClose();
    } catch (e: any) {
      toast({
        title: editingWork ? "Error updating work" : "Error creating work",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this work?")) return;

    try {
      await api.delete(`/works/${id}/`);
      toast({ title: "Work deleted successfully" });
      loadData();
    } catch (e: any) {
      toast({ title: "Error deleting work", description: e.message, variant: "destructive" });
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      await api.post("/categories/", { name: newCategory });
      toast({ title: "Category created successfully" });
      setNewCategory("");
      setCategoryOpen(false);
      loadData();
    } catch (e: any) {
      toast({ title: "Error creating category", description: e.message, variant: "destructive" });
    }
  };

  const handleAddRoomType = async () => {
    if (!newRoomType.trim()) return;

    try {
      await api.post("/room-types/", { name: newRoomType });
      toast({ title: "Room type created successfully" });
      setNewRoomType("");
      setRoomTypeOpen(false);
      loadData();
    } catch (e: any) {
      toast({ title: "Error creating room type", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      await api.delete(`/categories/${id}/`);
      toast({ title: "Category deleted successfully" });
      loadData();
    } catch (e: any) {
      toast({ title: "Error deleting category", description: e.message, variant: "destructive" });
    }
  };

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((cat) => cat.id === active.id);
    const newIndex = categories.findIndex((cat) => cat.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedCategories = [...categories];
    const [movedCategory] = reorderedCategories.splice(oldIndex, 1);
    reorderedCategories.splice(newIndex, 0, movedCategory);

    setCategories(reorderedCategories);

    try {
      for (let i = 0; i < reorderedCategories.length; i++) {
        await api.patch(`/categories/${reorderedCategories[i].id}/`, { display_order: i });
      }
      toast({ title: "Category order updated" });
    } catch (e: any) {
      toast({ title: "Error updating category order", description: e.message, variant: "destructive" });
      loadData();
    }
  };

  const handleDeleteRoomType = async (id: string) => {
    if (!confirm("Are you sure you want to delete this room type?")) return;

    try {
      await api.delete(`/room-types/${id}/`);
      toast({ title: "Room type deleted successfully" });
      loadData();
    } catch (e: any) {
      toast({ title: "Error deleting room type", description: e.message, variant: "destructive" });
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEditingWork(null);
    setFormData({
      name: "",
      description: "",
      unit_type: "m2",
      price_per_unit: "",
      category: "",
      calculation_base: "none",
      room_type_ids: [],
    });
  };

  const handleEdit = (work: Work) => {
    setEditingWork(work);
    setFormData({
      name: work.name,
      description: work.description || "",
      unit_type: work.unit_type,
      price_per_unit: work.price_per_unit.toString(),
      category: work.category || "",
      calculation_base: work.calculation_base || "none",
      room_type_ids: work.room_type_ids || [],
    });
    setOpen(true);
  };

  const searchResults = searchQuery.trim()
    ? works
        .filter((work) => {
          const query = searchQuery.toLowerCase();
          const categoryName = categories.find((c) => c.id === work.category)?.name || "";
          return (
            work.name.toLowerCase().includes(query) ||
            work.description?.toLowerCase().includes(query) ||
            categoryName.toLowerCase().includes(query)
          );
        })
        .slice(0, 5)
    : [];

  const worksByCategory = categories.map((category) => ({
    category,
    works: works.filter((work) => work.category === category.id),
  }));

  const uncategorizedWorks = works.filter((work) => !work.category);

  const handleSearchSelect = (work: Work) => {
    handleEdit(work);
    setSearchQuery("");
    setShowSearchDropdown(false);
  };

  const handleMoveUp = async (work: Work, categoryWorks: Work[]) => {
    const currentIndex = categoryWorks.findIndex((w) => w.id === work.id);
    if (currentIndex === 0) return;

    const prevWork = categoryWorks[currentIndex - 1];

    try {
      await Promise.all([
        api.patch(`/works/${work.id}/`, { display_order: prevWork.display_order }),
        api.patch(`/works/${prevWork.id}/`, { display_order: work.display_order }),
      ]);
      toast({ title: "Work moved up" });
      loadData();
    } catch (e: any) {
      toast({ title: "Error reordering work", description: e.message, variant: "destructive" });
    }
  };

  const handleMoveDown = async (work: Work, categoryWorks: Work[]) => {
    const currentIndex = categoryWorks.findIndex((w) => w.id === work.id);
    if (currentIndex === categoryWorks.length - 1) return;

    const nextWork = categoryWorks[currentIndex + 1];

    try {
      await Promise.all([
        api.patch(`/works/${work.id}/`, { display_order: nextWork.display_order }),
        api.patch(`/works/${nextWork.id}/`, { display_order: work.display_order }),
      ]);
      toast({ title: "Work moved down" });
      loadData();
    } catch (e: any) {
      toast({ title: "Error reordering work", description: e.message, variant: "destructive" });
    }
  };

  const downloadExampleCSV = () => {
    const csvContent = `Category Name,Work Name,Description,Unit,Price
Flooring,Ceramic Tile Installation,Standard ceramic tile with adhesive,m2,45.50
Painting,Interior Wall Painting,Premium paint with 2 coats,m2,25.00
Plumbing,Water Pipe Installation,PVC pipe installation with fittings,m,12.75
Electrical,Light Fixture Installation,Standard ceiling light fixture,pc,85.00
Carpentry,Custom Cabinet Set,Kitchen cabinet with hardware,set,450.00`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "works_example.csv";
    link.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      parseCSV(file);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());

      const data = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        return {
          categoryName: values[0],
          workName: values[1],
          description: values[2],
          unit: values[3],
          price: values[4],
        };
      });

      setParsedData(data);
    };
    reader.readAsText(file);
  };

  const handleImportConfirm = async () => {
    setIsProcessing(true);

    try {
      const categoryCache: Record<string, string> = {};

      for (const item of parsedData) {
        let categoryId: string | null = null;

        if (item.categoryName) {
          if (categoryCache[item.categoryName]) {
            categoryId = categoryCache[item.categoryName];
          } else {
            const existing = categories.find(
              (c) => c.name.toLowerCase() === item.categoryName.toLowerCase()
            );
            if (existing) {
              categoryId = existing.id;
            } else {
              const { data: newCat } = await api.post("/categories/", { name: item.categoryName });
              categoryId = newCat.id;
            }
            categoryCache[item.categoryName] = categoryId!;
          }
        }

        await api.post("/works/", {
          name: item.workName,
          description: item.description || null,
          unit_type: item.unit,
          price_per_unit: parseFloat(item.price),
          category: categoryId,
        });
      }

      toast({ title: `Successfully imported ${parsedData.length} works` });
      setImportOpen(false);
      setCsvFile(null);
      setParsedData([]);
      loadData();
    } catch (e: any) {
      toast({ title: "Error importing works", description: e.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const WorkTable = ({ categoryWorks, groupKey }: { categoryWorks: Work[]; groupKey: string }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Order</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Room Types</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Unit</TableHead>
          <TableHead>Price (AED)</TableHead>
          <TableHead className="w-[120px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categoryWorks.map((work, index) => (
          <TableRow key={work.id}>
            <TableCell>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleMoveUp(work, categoryWorks)}
                  disabled={index === 0}
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleMoveDown(work, categoryWorks)}
                  disabled={index === categoryWorks.length - 1}
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
            <TableCell className="font-medium">{work.name}</TableCell>
            <TableCell>
              {work.room_type_ids && work.room_type_ids.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {work.room_type_ids.map((rtId) => {
                    const roomType = roomTypes.find((rt) => rt.id === rtId);
                    return roomType ? (
                      <Badge key={rtId} variant="secondary" className="text-xs">
                        {roomType.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              ) : (
                "-"
              )}
            </TableCell>
            <TableCell className="max-w-xs truncate">{work.description || "-"}</TableCell>
            <TableCell>{work.unit_type}</TableCell>
            <TableCell>{Number(work.price_per_unit).toFixed(2)}</TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(work)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(work.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Works</h2>
          <p className="text-muted-foreground">Manage your works catalog and categories</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tag className="w-4 h-4 mr-2" />
                Categories
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Categories</DialogTitle>
                <DialogDescription>Add categories to organize your works</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Category name"
                  />
                  <Button onClick={handleAddCategory}>Add</Button>
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleCategoryDragEnd}
                >
                  <SortableContext
                    items={categories.map((cat) => cat.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {categories.map((cat) => (
                        <SortableCategory
                          key={cat.id}
                          category={cat}
                          onDelete={() => handleDeleteCategory(cat.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={roomTypeOpen} onOpenChange={setRoomTypeOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tag className="w-4 h-4 mr-2" />
                Room Types
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Room Types</DialogTitle>
                <DialogDescription>Add room types where works can be performed</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newRoomType}
                    onChange={(e) => setNewRoomType(e.target.value)}
                    placeholder="Room type name"
                  />
                  <Button onClick={handleAddRoomType}>Add</Button>
                </div>
                <div className="space-y-2">
                  {roomTypes.map((rt) => (
                    <div key={rt.id} className="flex items-center justify-between p-2 border rounded">
                      <span>{rt.name}</span>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRoomType(rt.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Import Works
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Works from CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file with columns: Category Name, Work Name, Description, Unit, Price
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Button variant="outline" className="w-full" onClick={downloadExampleCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Example CSV
                </Button>

                <div className="space-y-2">
                  <Label htmlFor="csv-file">Upload CSV File</Label>
                  <Input id="csv-file" type="file" accept=".csv" onChange={handleFileUpload} />
                </div>

                {parsedData.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Preview ({parsedData.length} works found)</p>
                    <div className="border rounded-lg p-3 max-h-48 overflow-auto">
                      {parsedData.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="text-sm py-1">
                          <span className="font-medium">{item.categoryName}</span> - {item.workName} ({item.unit}: {item.price} AED)
                        </div>
                      ))}
                      {parsedData.length > 5 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          ...and {parsedData.length - 5} more
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportOpen(false);
                    setCsvFile(null);
                    setParsedData([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImportConfirm}
                  disabled={parsedData.length === 0 || isProcessing}
                >
                  {isProcessing ? "Importing..." : "Import"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Work
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingWork ? "Edit Work" : "Add New Work"}</DialogTitle>
                <DialogDescription>Enter work details including pricing and unit type</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unit_type">Unit Type</Label>
                      <Select
                        value={formData.unit_type}
                        onValueChange={(value) => setFormData({ ...formData, unit_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="m2">m² (Square Meter)</SelectItem>
                          <SelectItem value="m">m (Meter)</SelectItem>
                          <SelectItem value="pc">pc (Piece)</SelectItem>
                          <SelectItem value="set">Set</SelectItem>
                          <SelectItem value="hr">Hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price per Unit (AED)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price_per_unit}
                        onChange={(e) => setFormData({ ...formData, price_per_unit: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calculation_base">Calculation Base</Label>
                    <Select
                      value={formData.calculation_base}
                      onValueChange={(value) => setFormData({ ...formData, calculation_base: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="wall">Wall</SelectItem>
                        <SelectItem value="floor">Floor</SelectItem>
                        <SelectItem value="perimeter">Perimeter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Room Types</Label>
                    <div className="grid grid-cols-2 gap-3 border rounded-lg p-4">
                      {roomTypes.map((rt) => (
                        <div key={rt.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`room-${rt.id}`}
                            checked={formData.room_type_ids.includes(rt.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  room_type_ids: [...formData.room_type_ids, rt.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  room_type_ids: formData.room_type_ids.filter((id) => id !== rt.id),
                                });
                              }
                            }}
                          />
                          <label
                            htmlFor={`room-${rt.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {rt.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingWork ? "Update" : "Create"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search works by name, description, or category..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {works.length} work{works.length !== 1 ? "s" : ""} total
          </div>
        </div>

        {showSearchDropdown && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-background border rounded-lg shadow-lg">
            <Command>
              <CommandList>
                <CommandGroup>
                  {searchResults.map((work) => (
                    <CommandItem
                      key={work.id}
                      onSelect={() => handleSearchSelect(work)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex-1">
                          <div className="font-medium">{work.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {categories.find((c) => c.id === work.category)?.name || "Uncategorized"}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {Number(work.price_per_unit).toFixed(2)} AED / {work.unit_type}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
      </div>

      <Accordion type="multiple" className="space-y-4">
        {worksByCategory.map(
          ({ category, works: categoryWorks }) =>
            categoryWorks.length > 0 && (
              <AccordionItem key={category.id} value={category.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{category.name}</Badge>
                    <span className="text-sm text-muted-foreground">
                      ({categoryWorks.length} work{categoryWorks.length !== 1 ? "s" : ""})
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <WorkTable categoryWorks={categoryWorks} groupKey={category.id} />
                </AccordionContent>
              </AccordionItem>
            )
        )}

        {uncategorizedWorks.length > 0 && (
          <AccordionItem value="uncategorized" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Uncategorized</Badge>
                <span className="text-sm text-muted-foreground">
                  ({uncategorizedWorks.length} work{uncategorizedWorks.length !== 1 ? "s" : ""})
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <WorkTable categoryWorks={uncategorizedWorks} groupKey="uncategorized" />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {works.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No works yet. Add your first work to get started.
        </div>
      )}
    </div>
  );
};

export default Works;

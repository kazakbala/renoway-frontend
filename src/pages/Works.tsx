import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { Plus, Pencil, Trash2, Tag, Search, Upload, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";

interface Category {
  id: string;
  name: string;
}

interface RoomType {
  id: string;
  name: string;
}

interface Work {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  unit_type: string;
  price_per_unit: number;
  calculation_base: string | null;
  categories?: Category;
  room_type_ids?: string[];
}

const Works = () => {
  const { toast } = useToast();
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    unit_type: "m2",
    price_per_unit: "",
    category_id: "",
    calculation_base: "none",
    room_type_ids: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [worksRes, categoriesRes, roomTypesRes] = await Promise.all([
      supabase.from("works").select("*, categories(*)").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
      supabase.from("room_types").select("*").order("name"),
    ]);

    if (worksRes.error) {
      toast({
        title: "Error loading works",
        description: worksRes.error.message,
        variant: "destructive",
      });
    } else {
      // Load room types for each work
      const worksWithRoomTypes = await Promise.all(
        (worksRes.data || []).map(async (work) => {
          const { data: workRoomTypes } = await supabase
            .from("work_room_types")
            .select("room_type_id")
            .eq("work_id", work.id);
          return {
            ...work,
            room_type_ids: workRoomTypes?.map((rt) => rt.room_type_id) || [],
          };
        })
      );
      setWorks(worksWithRoomTypes);
    }

    if (categoriesRes.error) {
      toast({
        title: "Error loading categories",
        description: categoriesRes.error.message,
        variant: "destructive",
      });
    } else {
      setCategories(categoriesRes.data || []);
    }

    if (roomTypesRes.error) {
      toast({
        title: "Error loading room types",
        description: roomTypesRes.error.message,
        variant: "destructive",
      });
    } else {
      setRoomTypes(roomTypesRes.data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const workData = {
      name: formData.name,
      description: formData.description,
      unit_type: formData.unit_type,
      price_per_unit: parseFloat(formData.price_per_unit),
      category_id: formData.category_id || null,
      calculation_base: formData.calculation_base === "none" ? null : formData.calculation_base,
    };

    if (editingWork) {
      const { error } = await supabase
        .from("works")
        .update(workData)
        .eq("id", editingWork.id);

      if (error) {
        toast({
          title: "Error updating work",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Update room type relationships
      await supabase.from("work_room_types").delete().eq("work_id", editingWork.id);
      
      if (formData.room_type_ids.length > 0) {
        const roomTypeRelations = formData.room_type_ids.map((rtId) => ({
          work_id: editingWork.id,
          room_type_id: rtId,
        }));
        await supabase.from("work_room_types").insert(roomTypeRelations);
      }

      toast({ title: "Work updated successfully" });
      loadData();
      handleClose();
    } else {
      const { data, error } = await supabase.from("works").insert([workData]).select().single();

      if (error) {
        toast({
          title: "Error creating work",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Insert room type relationships
      if (data && formData.room_type_ids.length > 0) {
        const roomTypeRelations = formData.room_type_ids.map((rtId) => ({
          work_id: data.id,
          room_type_id: rtId,
        }));
        await supabase.from("work_room_types").insert(roomTypeRelations);
      }

      toast({ title: "Work created successfully" });
      loadData();
      handleClose();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this work?")) return;

    const { error } = await supabase.from("works").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting work",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Work deleted successfully" });
      loadData();
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;

    const { error } = await supabase.from("categories").insert([{ name: newCategory }]);

    if (error) {
      toast({
        title: "Error creating category",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Category created successfully" });
      setNewCategory("");
      setCategoryOpen(false);
      loadData();
    }
  };

  const handleAddRoomType = async () => {
    if (!newRoomType.trim()) return;

    const { error } = await supabase.from("room_types").insert([{ name: newRoomType }]);

    if (error) {
      toast({
        title: "Error creating room type",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Room type created successfully" });
      setNewRoomType("");
      setRoomTypeOpen(false);
      loadData();
    }
  };

  const handleDeleteRoomType = async (id: string) => {
    if (!confirm("Are you sure you want to delete this room type?")) return;

    const { error } = await supabase.from("room_types").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting room type",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Room type deleted successfully" });
      loadData();
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
      category_id: "",
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
      category_id: work.category_id || "",
      calculation_base: work.calculation_base || "none",
      room_type_ids: work.room_type_ids || [],
    });
    setOpen(true);
  };

  // Filter works based on search query
  const filteredWorks = works.filter((work) => {
    const query = searchQuery.toLowerCase();
    return (
      work.name.toLowerCase().includes(query) ||
      work.description?.toLowerCase().includes(query) ||
      work.categories?.name.toLowerCase().includes(query)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredWorks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedWorks = filteredWorks.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const downloadExampleCSV = () => {
    const csvContent = `Category Name,Work Name,Description,Unit,Price
Flooring,Ceramic Tile Installation,Standard ceramic tile with adhesive,m2,45.50
Painting,Interior Wall Painting,Premium paint with 2 coats,m2,25.00
Plumbing,Water Pipe Installation,PVC pipe installation with fittings,m,12.75
Electrical,Light Fixture Installation,Standard ceiling light fixture,pc,85.00
Carpentry,Custom Cabinet Set,Kitchen cabinet with hardware,set,450.00`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'works_example.csv';
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
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        return {
          categoryName: values[0],
          workName: values[1],
          description: values[2],
          unit: values[3],
          price: values[4]
        };
      });
      
      setParsedData(data);
    };
    reader.readAsText(file);
  };

  const handleImportConfirm = async () => {
    setIsProcessing(true);
    
    try {
      for (const item of parsedData) {
        // Check if category exists
        let categoryId = null;
        if (item.categoryName) {
          const { data: existingCategory } = await supabase
            .from('categories')
            .select('id')
            .eq('name', item.categoryName)
            .single();
          
          if (existingCategory) {
            categoryId = existingCategory.id;
          } else {
            // Create new category
            const { data: newCat, error: catError } = await supabase
              .from('categories')
              .insert([{ name: item.categoryName }])
              .select('id')
              .single();
            
            if (catError) throw catError;
            categoryId = newCat.id;
          }
        }
        
        // Insert work
        const { error: workError } = await supabase
          .from('works')
          .insert([{
            name: item.workName,
            description: item.description || null,
            unit_type: item.unit,
            price_per_unit: parseFloat(item.price),
            category_id: categoryId
          }]);
        
        if (workError) throw workError;
      }
      
      toast({ title: `Successfully imported ${parsedData.length} works` });
      setImportOpen(false);
      setCsvFile(null);
      setParsedData([]);
      loadData();
    } catch (error: any) {
      toast({
        title: "Error importing works",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

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
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-2 border rounded">
                      <span>{cat.name}</span>
                    </div>
                  ))}
                </div>
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
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={downloadExampleCSV}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Example CSV
                </Button>
                
                <div className="space-y-2">
                  <Label htmlFor="csv-file">Upload CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                  />
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
                        value={formData.category_id}
                        onValueChange={(value) => setFormData({ ...formData, category_id: value })}
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

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search works by name, description, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredWorks.length} work{filteredWorks.length !== 1 ? 's' : ''} found
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Room Types</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Price (AED)</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedWorks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {searchQuery ? "No works found matching your search." : "No works yet. Add your first work to get started."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedWorks.map((work) => (
                <TableRow key={work.id}>
                  <TableCell className="font-medium">{work.name}</TableCell>
                  <TableCell>
                    {work.categories ? (
                      <Badge variant="outline">{work.categories.name}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
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
                  <TableCell>{work.price_per_unit.toFixed(2)}</TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              const showPage = page === 1 || 
                              page === totalPages || 
                              (page >= currentPage - 1 && page <= currentPage + 1);
              
              if (!showPage) {
                // Show ellipsis
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <PaginationItem key={page}>
                      <span className="px-4">...</span>
                    </PaginationItem>
                  );
                }
                return null;
              }

              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => setCurrentPage(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}

            <PaginationItem>
              <PaginationNext 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default Works;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Material {
  id: string;
  name: string;
  unit_type: string;
  price_per_unit: number;
}

const Materials = () => {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    unit_type: "m2",
    price_per_unit: "",
  });

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .order("name");

    if (error) {
      toast({
        title: "Error loading materials",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (data) {
      setMaterials(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const materialData = {
      name: formData.name,
      unit_type: formData.unit_type,
      price_per_unit: parseFloat(formData.price_per_unit),
    };

    if (editingMaterial) {
      const { error } = await supabase
        .from("materials")
        .update(materialData)
        .eq("id", editingMaterial.id);

      if (error) {
        toast({
          title: "Error updating material",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Material updated",
          description: "Material has been updated successfully.",
        });
        setDialogOpen(false);
        resetForm();
        loadMaterials();
      }
    } else {
      const { error } = await supabase.from("materials").insert([materialData]);

      if (error) {
        toast({
          title: "Error creating material",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Material created",
          description: "Material has been created successfully.",
        });
        setDialogOpen(false);
        resetForm();
        loadMaterials();
      }
    }

    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this material?")) return;

    const { error } = await supabase.from("materials").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting material",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Material deleted",
      description: "Material has been deleted successfully.",
    });
    loadMaterials();
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      unit_type: material.unit_type,
      price_per_unit: material.price_per_unit.toString(),
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      unit_type: "m2",
      price_per_unit: "",
    });
    setEditingMaterial(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Materials</h2>
          <p className="text-muted-foreground">Manage building materials and their costs</p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Material
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Unit Type</TableHead>
            <TableHead className="text-right">Price per Unit</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.map((material) => (
            <TableRow key={material.id}>
              <TableCell className="font-medium">{material.name}</TableCell>
              <TableCell>{material.unit_type}</TableCell>
              <TableCell className="text-right">
                {material.price_per_unit.toFixed(2)}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(material)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(material.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {materials.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No materials found. Add your first material to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? "Edit Material" : "Add Material"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Material Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_type">Unit Type</Label>
              <Select
                value={formData.unit_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, unit_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="m2">m²</SelectItem>
                  <SelectItem value="m">m</SelectItem>
                  <SelectItem value="pc">pc</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_per_unit">Price per Unit</Label>
              <Input
                id="price_per_unit"
                type="number"
                step="0.01"
                value={formData.price_per_unit}
                onChange={(e) =>
                  setFormData({ ...formData, price_per_unit: e.target.value })
                }
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : editingMaterial ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Materials;

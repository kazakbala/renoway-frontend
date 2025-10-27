import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, FileDown, Search } from "lucide-react";
import { exportToPDF } from "@/lib/pdf-export";
import { Textarea } from "@/components/ui/textarea";

interface Client {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

interface Work {
  id: string;
  name: string;
  description: string | null;
  unit_type: string;
  price_per_unit: number;
}

interface ProjectWork {
  id?: string;
  work_id: string | null;
  name: string;
  description: string;
  unit_type: string;
  price_per_unit: number;
  quantity: number;
}

interface Block {
  id?: string;
  name: string;
  works: ProjectWork[];
}

const ProjectEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projectName, setProjectName] = useState("");
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([{ name: "Block 1", works: [] }]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    const [clientsRes, worksRes] = await Promise.all([
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("works").select("*").order("name"),
    ]);

    if (clientsRes.data) setClients(clientsRes.data);
    if (worksRes.data) setWorks(worksRes.data);

    if (id) {
      const { data: project } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (project) {
        setProjectName(project.name);
        setClientId(project.client_id);

        const { data: projectBlocks } = await supabase
          .from("project_blocks")
          .select("*, project_works(*)")
          .eq("project_id", id)
          .order("order_index");

        if (projectBlocks) {
          setBlocks(
            projectBlocks.map((block: any) => ({
              id: block.id,
              name: block.name,
              works: block.project_works || [],
            }))
          );
        }
      }
    }
  };

  const addBlock = () => {
    setBlocks([...blocks, { name: `Block ${blocks.length + 1}`, works: [] }]);
  };

  const removeBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const addWorkToBlock = (blockIndex: number, work: Work) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].works.push({
      work_id: work.id,
      name: work.name,
      description: work.description || "",
      unit_type: work.unit_type,
      price_per_unit: work.price_per_unit,
      quantity: 1,
    });
    setBlocks(newBlocks);
    setSearchQuery("");
  };

  const updateWork = (blockIndex: number, workIndex: number, field: string, value: any) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].works[workIndex] = {
      ...newBlocks[blockIndex].works[workIndex],
      [field]: value,
    };
    setBlocks(newBlocks);
  };

  const removeWork = (blockIndex: number, workIndex: number) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].works.splice(workIndex, 1);
    setBlocks(newBlocks);
  };

  const calculateBlockTotal = (block: Block) => {
    return block.works.reduce(
      (sum, work) => sum + work.price_per_unit * work.quantity,
      0
    );
  };

  const calculateGrandTotal = () => {
    return blocks.reduce((sum, block) => sum + calculateBlockTotal(block), 0);
  };

  const handleSave = async () => {
    if (!projectName || !clientId) {
      toast({
        title: "Missing information",
        description: "Please enter project name and select a client",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let projectId = id;

      if (id) {
        await supabase.from("projects").update({ name: projectName, client_id: clientId }).eq("id", id);
        await supabase.from("project_blocks").delete().eq("project_id", id);
      } else {
        const { data: newProject, error } = await supabase
          .from("projects")
          .insert([{ name: projectName, client_id: clientId }])
          .select()
          .single();

        if (error) throw error;
        projectId = newProject.id;
      }

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const { data: newBlock, error: blockError } = await supabase
          .from("project_blocks")
          .insert([{ project_id: projectId, name: block.name, order_index: i }])
          .select()
          .single();

        if (blockError) throw blockError;

        if (block.works.length > 0) {
          const worksToInsert = block.works.map((work) => ({
            project_block_id: newBlock.id,
            work_id: work.work_id,
            name: work.name,
            description: work.description,
            unit_type: work.unit_type,
            price_per_unit: work.price_per_unit,
            quantity: work.quantity,
          }));

          const { error: worksError } = await supabase
            .from("project_works")
            .insert(worksToInsert);

          if (worksError) throw worksError;
        }
      }

      toast({ title: "Project saved successfully" });
      navigate("/dashboard/projects");
    } catch (error: any) {
      toast({
        title: "Error saving project",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    const client = clients.find((c) => c.id === clientId);
    await exportToPDF({
      projectName,
      client: client
        ? { 
            full_name: client.full_name || "",
            email: client.email || "", 
            phone: client.phone || "" 
          }
        : { 
            full_name: "",
            email: "", 
            phone: "" 
          },
      blocks: blocks.map((block) => ({
        name: block.name,
        works: block.works,
        subtotal: calculateBlockTotal(block),
      })),
      grandTotal: calculateGrandTotal(),
    });
  };

  const filteredWorks = works.filter(
    (work) =>
      work.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (work.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/dashboard/projects")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Button>
        <div className="flex gap-2">
          {id && (
            <Button variant="outline" onClick={handleExportPDF}>
              <FileDown className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          )}
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Project"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name || client.email || client.phone || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Add Works</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search works..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <div className="mt-4 max-h-60 overflow-y-auto border rounded-lg">
              {filteredWorks.map((work) => (
                <div
                  key={work.id}
                  className="p-3 border-b last:border-0 hover:bg-accent cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{work.name}</p>
                      <p className="text-sm text-muted-foreground">{work.description}</p>
                      <p className="text-sm text-primary">
                        {work.price_per_unit} AED / {work.unit_type}
                      </p>
                    </div>
                    <Select
                      onValueChange={(value) => addWorkToBlock(parseInt(value), work)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Add to..." />
                      </SelectTrigger>
                      <SelectContent>
                        {blocks.map((block, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {block.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {blocks.map((block, blockIndex) => (
        <Card key={blockIndex}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Input
                value={block.name}
                onChange={(e) => {
                  const newBlocks = [...blocks];
                  newBlocks[blockIndex].name = e.target.value;
                  setBlocks(newBlocks);
                }}
                className="text-lg font-semibold border-0 p-0 h-auto focus-visible:ring-0"
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Subtotal: {calculateBlockTotal(block).toFixed(2)} AED
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBlock(blockIndex)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {block.works.map((work, workIndex) => (
                <div key={workIndex} className="border rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={work.name}
                        onChange={(e) =>
                          updateWork(blockIndex, workIndex, "name", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Unit Type</Label>
                      <Input
                        value={work.unit_type}
                        onChange={(e) =>
                          updateWork(blockIndex, workIndex, "unit_type", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Price/Unit (AED)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={work.price_per_unit}
                        onChange={(e) =>
                          updateWork(
                            blockIndex,
                            workIndex,
                            "price_per_unit",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={work.quantity}
                        onChange={(e) =>
                          updateWork(
                            blockIndex,
                            workIndex,
                            "quantity",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={work.description}
                      onChange={(e) =>
                        updateWork(blockIndex, workIndex, "description", e.target.value)
                      }
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">
                      Total: {(work.price_per_unit * work.quantity).toFixed(2)} AED
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWork(blockIndex, workIndex)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={addBlock}>
          <Plus className="w-4 h-4 mr-2" />
          Add Block
        </Button>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Grand Total</p>
          <p className="text-3xl font-bold text-primary">
            {calculateGrandTotal().toFixed(2)} AED
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProjectEditor;

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
import { ArrowLeft, Plus, Trash2, FileDown, Search, Link2, Copy, Calendar, Sparkles } from "lucide-react";
import { exportToPDF } from "@/lib/pdf-export";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";

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
  progress?: number;
  start_date?: string | null;
  end_date?: string | null;
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
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [potentialToSign, setPotentialToSign] = useState(0);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [isGeneratingTimeline, setIsGeneratingTimeline] = useState(false);

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
        setShareToken(project.share_token);
        setPotentialToSign(project.potential_to_sign || 0);
        setTimeline(Array.isArray(project.preliminary_timeline) ? project.preliminary_timeline : []);

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
      progress: 0,
      start_date: null,
      end_date: null,
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
        await supabase.from("projects").update({ name: projectName, client_id: clientId, potential_to_sign: potentialToSign }).eq("id", id);
        await supabase.from("project_blocks").delete().eq("project_id", id);
      } else {
        const { data: newProject, error } = await supabase
          .from("projects")
          .insert([{ name: projectName, client_id: clientId, potential_to_sign: potentialToSign }])
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
            progress: work.progress || 0,
            start_date: work.start_date || null,
            end_date: work.end_date || null,
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
    if (!id) {
      toast({
        title: "Please save the project first",
        description: "You need to save the project before exporting to PDF",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch project to get timeline
      const { data: project } = await supabase
        .from("projects")
        .select("preliminary_timeline")
        .eq("id", id)
        .single();

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
        timeline: project?.preliminary_timeline as any || undefined,
      });
    } catch (error: any) {
      toast({
        title: "Error exporting PDF",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateShareLink = async () => {
    if (!id) {
      toast({
        title: "Please save the project first",
        description: "You need to save the project before generating a share link",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc("generate_share_token");
      if (error) throw error;

      const token = data;
      await supabase.from("projects").update({ share_token: token }).eq("id", id);
      
      setShareToken(token);
      toast({ title: "Share link generated successfully" });
    } catch (error: any) {
      toast({
        title: "Error generating share link",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyShareLink = () => {
    if (!shareToken) return;
    const link = `${window.location.origin}/project-tracking/${shareToken}`;
    navigator.clipboard.writeText(link);
    setCopySuccess(true);
    toast({ title: "Link copied to clipboard" });
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const filteredWorks = works.filter(
    (work) =>
      work.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (work.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGenerateTimeline = async () => {
    if (!id) {
      toast({
        title: "Please save the project first",
        description: "You need to save the project before generating a timeline",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingTimeline(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-timeline', { 
        body: { projectId: id } 
      });
      
      if (error) throw error;
      
      // Fetch the updated project to get the timeline
      const { data: project } = await supabase
        .from("projects")
        .select("preliminary_timeline")
        .eq("id", id)
        .single();
      
      if (project?.preliminary_timeline) {
        setTimeline(Array.isArray(project.preliminary_timeline) ? project.preliminary_timeline : []);
        toast({ title: "Timeline generated successfully" });
      }
    } catch (error: any) {
      toast({
        title: "Error generating timeline",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingTimeline(false);
    }
  };

  const handleSaveTimeline = async () => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from("projects")
        .update({ preliminary_timeline: timeline })
        .eq("id", id);
      
      if (error) throw error;
      
      toast({ title: "Timeline saved successfully" });
    } catch (error: any) {
      toast({
        title: "Error saving timeline",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateTimelineItem = (index: number, field: string, value: any) => {
    const newTimeline = [...timeline];
    newTimeline[index] = {
      ...newTimeline[index],
      [field]: value,
    };
    setTimeline(newTimeline);
  };

  const removeTimelineItem = (index: number) => {
    setTimeline(timeline.filter((_, i) => i !== index));
  };

  const addTimelineItem = () => {
    setTimeline([
      ...timeline,
      {
        phase: timeline.length + 1,
        work: "",
        durationDays: "",
      },
    ]);
  };

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
          <CardTitle>{id ? "Edit Project" : "Create Project"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="details">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Project Details</TabsTrigger>
              <TabsTrigger value="timeline" disabled={!id}>Preliminary Timeline</TabsTrigger>
              <TabsTrigger value="progress" disabled={!id}>Progress Tracking</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 mt-6">
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

              <div className="space-y-2">
                <Label>Potential to Sign: {potentialToSign}%</Label>
                <Slider
                  value={[potentialToSign]}
                  onValueChange={(value) => setPotentialToSign(value[0])}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

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
            </TabsContent>

            <TabsContent value="timeline" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Preliminary Timeline
                    </CardTitle>
                    <div className="flex gap-2">
                      {timeline.length > 0 && (
                        <Button onClick={handleSaveTimeline} variant="outline">
                          Save Timeline
                        </Button>
                      )}
                      <Button 
                        onClick={handleGenerateTimeline} 
                        disabled={isGeneratingTimeline}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {isGeneratingTimeline ? "Generating..." : "Generate with AI"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isGeneratingTimeline && (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Generating timeline with AI...</p>
                    </div>
                  )}
                  
                  {!isGeneratingTimeline && timeline.length === 0 && (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">
                        No timeline generated yet. Click "Generate with AI" to create one.
                      </p>
                    </div>
                  )}

                  {!isGeneratingTimeline && timeline.length > 0 && (
                    <div className="space-y-4">
                      {timeline.map((item: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3">
                          <div className="grid grid-cols-4 gap-3">
                            <div>
                              <Label className="text-xs">Phase</Label>
                              <Input
                                type="number"
                                value={item.phase || ""}
                                onChange={(e) =>
                                  updateTimelineItem(index, "phase", parseInt(e.target.value) || "")
                                }
                                placeholder="1"
                                min="1"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Work</Label>
                              <Input
                                value={item.work || ""}
                                readOnly
                                className="bg-muted"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Duration (days)</Label>
                              <Input
                                type="number"
                                value={item.durationDays || ""}
                                onChange={(e) =>
                                  updateTimelineItem(index, "durationDays", e.target.value)
                                }
                                placeholder="7"
                                min="1"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTimelineItem(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" onClick={addTimelineItem}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Timeline Item
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress" className="space-y-6 mt-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Link2 className="w-5 h-5" />
                      Client Tracking Link
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {shareToken ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            readOnly
                            value={`${window.location.origin}/project-tracking/${shareToken}`}
                            className="flex-1"
                          />
                          <Button onClick={copyShareLink} variant="outline">
                            <Copy className="w-4 h-4 mr-2" />
                            {copySuccess ? "Copied!" : "Copy"}
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Share this link with your client to let them track project progress
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Generate a public tracking link for your client
                        </p>
                        <Button onClick={generateShareLink}>
                          <Link2 className="w-4 h-4 mr-2" />
                          Generate Share Link
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {blocks.map((block, blockIndex) => (
                  <Card key={blockIndex}>
                    <CardHeader>
                      <CardTitle>{block.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {block.works.map((work, workIndex) => (
                          <div key={workIndex} className="border rounded-lg p-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">{work.name}</h4>
                              <span className="text-xl font-bold text-primary">
                                {work.progress || 0}%
                              </span>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">Progress (%)</Label>
                              <div className="flex items-center gap-4">
                                <Progress value={work.progress || 0} className="flex-1" />
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={work.progress || 0}
                                  onChange={(e) =>
                                    updateWork(
                                      blockIndex,
                                      workIndex,
                                      "progress",
                                      Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                                    )
                                  }
                                  className="w-20"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Start Date
                                </Label>
                                <Input
                                  type="date"
                                  value={work.start_date || ""}
                                  onChange={(e) =>
                                    updateWork(blockIndex, workIndex, "start_date", e.target.value)
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  End Date
                                </Label>
                                <Input
                                  type="date"
                                  value={work.end_date || ""}
                                  onChange={(e) =>
                                    updateWork(blockIndex, workIndex, "end_date", e.target.value)
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectEditor;

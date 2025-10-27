import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";

interface Project {
  id: string;
  name: string;
  clients: {
    full_name: string | null;
    email: string | null;
  };
}

interface ProjectWork {
  id: string;
  name: string;
  description: string | null;
  unit_type: string;
  price_per_unit: number;
  quantity: number;
  project_blocks: {
    name: string;
  };
}

const InvoiceEditor = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectWorks, setProjectWorks] = useState<ProjectWork[]>([]);
  const [selectedWorks, setSelectedWorks] = useState<Set<string>>(new Set());
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectWorks(selectedProjectId);
    } else {
      setProjectWorks([]);
      setSelectedWorks(new Set());
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*, clients(full_name, email)")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading projects",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProjects(data || []);
    }
  };

  const loadProjectWorks = async (projectId: string) => {
    const { data: blocks } = await supabase
      .from("project_blocks")
      .select("id")
      .eq("project_id", projectId);

    if (!blocks || blocks.length === 0) {
      setProjectWorks([]);
      return;
    }

    const blockIds = blocks.map((b) => b.id);

    const { data, error } = await supabase
      .from("project_works")
      .select(`
        *,
        project_blocks(name)
      `)
      .in("project_block_id", blockIds);

    if (error) {
      toast({
        title: "Error loading project works",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProjectWorks(data || []);
    }
  };

  const toggleWork = (workId: string) => {
    const newSelected = new Set(selectedWorks);
    if (newSelected.has(workId)) {
      newSelected.delete(workId);
    } else {
      newSelected.add(workId);
    }
    setSelectedWorks(newSelected);
  };

  const handleSave = async () => {
    if (!selectedProjectId) {
      toast({
        title: "Validation Error",
        description: "Please select a project",
        variant: "destructive",
      });
      return;
    }

    if (!invoiceNumber) {
      toast({
        title: "Validation Error",
        description: "Please enter an invoice number",
        variant: "destructive",
      });
      return;
    }

    if (selectedWorks.size === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one work item",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert([
        {
          project_id: selectedProjectId,
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          status,
          notes: notes || null,
        },
      ])
      .select()
      .single();

    if (invoiceError) {
      toast({
        title: "Error creating invoice",
        description: invoiceError.message,
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    // Create invoice items
    const items = Array.from(selectedWorks).map((workId) => {
      const work = projectWorks.find((w) => w.id === workId);
      return {
        invoice_id: invoice.id,
        project_work_id: workId,
        quantity: work!.quantity,
        price_per_unit: work!.price_per_unit,
      };
    });

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(items);

    if (itemsError) {
      toast({
        title: "Error creating invoice items",
        description: itemsError.message,
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    toast({ title: "Invoice created successfully" });
    navigate("/dashboard/invoices");
  };

  const calculateTotal = () => {
    return Array.from(selectedWorks).reduce((sum, workId) => {
      const work = projectWorks.find((w) => w.id === workId);
      if (work) {
        return sum + work.price_per_unit * work.quantity;
      }
      return sum;
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/invoices")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Create Invoice</h2>
          <p className="text-muted-foreground">Select project and works to invoice</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="invoiceNumber">Invoice Number *</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-001"
              />
            </div>

            <div>
              <Label htmlFor="invoiceDate">Invoice Date</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="project">Select Project *</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} - {project.clients?.full_name || project.clients?.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {selectedProjectId && (
        <Card>
          <CardHeader>
            <CardTitle>Select Works to Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            {projectWorks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No works found in this project
              </p>
            ) : (
              <div className="space-y-4">
                {projectWorks.map((work) => (
                  <div
                    key={work.id}
                    className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50"
                  >
                    <Checkbox
                      checked={selectedWorks.has(work.id)}
                      onCheckedChange={() => toggleWork(work.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{work.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Block: {work.project_blocks.name}
                      </div>
                      {work.description && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {work.description}
                        </div>
                      )}
                      <div className="text-sm mt-2">
                        {work.quantity} {work.unit_type} × {work.price_per_unit.toFixed(2)} AED ={" "}
                        <span className="font-medium">
                          {(work.quantity * work.price_per_unit).toFixed(2)} AED
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="border-t pt-4 flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span>{calculateTotal().toFixed(2)} AED</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => navigate("/dashboard/invoices")}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Invoice"}
        </Button>
      </div>
    </div>
  );
};

export default InvoiceEditor;

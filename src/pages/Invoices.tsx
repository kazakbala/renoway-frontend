import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Trash2, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { exportInvoiceToPDF } from "@/lib/invoice-pdf-export";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  status: string;
  notes: string | null;
  projects: {
    name: string;
    clients: {
      full_name: string | null;
      email: string | null;
      phone: string | null;
    };
  };
}

const Invoices = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select(`
        *,
        projects (
          name,
          clients (
            full_name,
            email,
            phone
          )
        )
      `)
      .order("invoice_date", { ascending: false });

    if (error) {
      toast({
        title: "Error loading invoices",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setInvoices(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    const { error } = await supabase.from("invoices").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting invoice",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Invoice deleted successfully" });
      loadInvoices();
    }
  };

  const handleExport = async (invoiceId: string) => {
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        *,
        projects (
          name,
          clients (
            full_name,
            email,
            phone
          )
        )
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      toast({
        title: "Error loading invoice",
        description: invoiceError?.message,
        variant: "destructive",
      });
      return;
    }

    const { data: items, error: itemsError } = await supabase
      .from("invoice_items")
      .select(`
        *,
        project_works (
          name,
          description,
          unit_type,
          project_blocks (
            name
          )
        )
      `)
      .eq("invoice_id", invoiceId);

    if (itemsError) {
      toast({
        title: "Error loading invoice items",
        description: itemsError.message,
        variant: "destructive",
      });
      return;
    }

    // Group items by block
    const blockMap = new Map();
    let grandTotal = 0;

    items?.forEach((item: any) => {
      const blockName = item.project_works.project_blocks.name;
      if (!blockMap.has(blockName)) {
        blockMap.set(blockName, { name: blockName, works: [], subtotal: 0 });
      }

      const total = item.quantity * item.price_per_unit;
      grandTotal += total;

      blockMap.get(blockName).works.push({
        name: item.project_works.name,
        description: item.project_works.description,
        unit_type: item.project_works.unit_type,
        price_per_unit: item.price_per_unit,
        quantity: item.quantity,
      });

      blockMap.get(blockName).subtotal += total;
    });

    const blocks = Array.from(blockMap.values());

    await exportInvoiceToPDF({
      invoiceNumber: invoice.invoice_number,
      invoiceDate: invoice.invoice_date,
      projectName: invoice.projects.name,
      client: {
        full_name: invoice.projects.clients.full_name || "",
        email: invoice.projects.clients.email || "",
        phone: invoice.projects.clients.phone || "",
      },
      blocks,
      grandTotal,
      notes: invoice.notes,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invoices</h2>
          <p className="text-muted-foreground">Create and manage client invoices</p>
        </div>
        <Button onClick={() => navigate("/dashboard/invoices/create")}>
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No invoices yet. Create your first invoice to get started.
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell>{invoice.projects.name}</TableCell>
                  <TableCell>
                    {invoice.projects.clients?.full_name ||
                      invoice.projects.clients?.email ||
                      invoice.projects.clients?.phone ||
                      "-"}
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.invoice_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      invoice.status === 'paid' 
                        ? 'bg-green-100 text-green-800' 
                        : invoice.status === 'sent'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {invoice.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleExport(invoice.id)}
                        title="Export PDF"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(invoice.id)}
                        title="Delete"
                      >
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
    </div>
  );
};

export default Invoices;

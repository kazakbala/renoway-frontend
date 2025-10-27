import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Copy, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Project {
  id: string;
  name: string;
  created_at: string;
  clients: {
    email: string | null;
    phone: string | null;
  };
}

const Projects = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*, clients(*)")
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting project",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Project deleted successfully" });
      loadProjects();
    }
  };

  const handleDuplicate = async (project: Project) => {
    // Load project details
    const { data: blocks } = await supabase
      .from("project_blocks")
      .select("*, project_works(*)")
      .eq("project_id", project.id)
      .order("order_index");

    if (!blocks) return;

    // Create new project
    const { data: newProject, error: projectError } = await supabase
      .from("projects")
      .insert([
        {
          name: `${project.name} (Copy)`,
          client_id: project.clients ? (project as any).client_id : null,
        },
      ])
      .select()
      .single();

    if (projectError) {
      toast({
        title: "Error duplicating project",
        description: projectError.message,
        variant: "destructive",
      });
      return;
    }

    // Duplicate blocks and works
    for (const block of blocks) {
      const { data: newBlock } = await supabase
        .from("project_blocks")
        .insert([
          {
            project_id: newProject.id,
            name: block.name,
            order_index: block.order_index,
          },
        ])
        .select()
        .single();

      if (newBlock && block.project_works) {
        const works = block.project_works.map((work: any) => ({
          project_block_id: newBlock.id,
          work_id: work.work_id,
          name: work.name,
          description: work.description,
          unit_type: work.unit_type,
          price_per_unit: work.price_per_unit,
          quantity: work.quantity,
        }));

        await supabase.from("project_works").insert(works);
      }
    }

    toast({ title: "Project duplicated successfully" });
    loadProjects();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>
          <p className="text-muted-foreground">Create and manage renovation projects</p>
        </div>
        <Button onClick={() => navigate("/dashboard/projects/create")}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No projects yet. Create your first project to get started.
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>
                    {project.clients?.email || project.clients?.phone || "-"}
                  </TableCell>
                  <TableCell>
                    {new Date(project.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicate(project)}
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(project.id)}
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

export default Projects;

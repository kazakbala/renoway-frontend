import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { format, differenceInDays } from "date-fns";
import { Calendar, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProjectWork {
  id: string;
  name: string;
  description: string | null;
  progress: number;
  start_date: string | null;
  end_date: string | null;
  quantity: number;
  unit_type: string;
  price_per_unit: number;
}

interface Block {
  id: string;
  name: string;
  order_index: number;
  project_works: ProjectWork[];
}

interface Project {
  id: string;
  name: string;
  client_id: string;
}

interface Client {
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

const ProjectTracking = () => {
  const { token } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjectData();
  }, [token]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*, clients(*)")
        .eq("share_token", token)
        .single();

      if (projectError) throw new Error("Project not found");

      setProject(projectData);
      setClient(projectData.clients);

      const { data: blocksData, error: blocksError } = await supabase
        .from("project_blocks")
        .select("*, project_works(*)")
        .eq("project_id", projectData.id)
        .order("order_index");

      if (blocksError) throw blocksError;

      setBlocks(blocksData || []);
    } catch (err: any) {
      setError(err.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallProgress = () => {
    const allWorks = blocks.flatMap((block) => block.project_works);
    if (allWorks.length === 0) return 0;
    const totalProgress = allWorks.reduce((sum, work) => sum + (work.progress || 0), 0);
    return Math.round(totalProgress / allWorks.length);
  };

  const getAllWorksWithDates = () => {
    return blocks
      .flatMap((block) =>
        block.project_works
          .filter((work) => work.start_date && work.end_date)
          .map((work) => ({ ...work, blockName: block.name }))
      )
      .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime());
  };

  const getTimelineRange = () => {
    const worksWithDates = getAllWorksWithDates();
    if (worksWithDates.length === 0) return null;

    const startDates = worksWithDates.map((w) => new Date(w.start_date!));
    const endDates = worksWithDates.map((w) => new Date(w.end_date!));

    return {
      min: new Date(Math.min(...startDates.map((d) => d.getTime()))),
      max: new Date(Math.max(...endDates.map((d) => d.getTime()))),
    };
  };

  const calculatePosition = (date: string, range: { min: Date; max: Date }) => {
    const dateObj = new Date(date);
    const totalDays = differenceInDays(range.max, range.min);
    const daysFromStart = differenceInDays(dateObj, range.min);
    return (daysFromStart / totalDays) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg">Loading project details...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || "Project not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const timelineRange = getTimelineRange();
  const worksWithDates = getAllWorksWithDates();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{project.name}</CardTitle>
            {client && (
              <div className="text-sm text-muted-foreground space-y-1">
                {client.full_name && <p>Client: {client.full_name}</p>}
                {client.email && <p>Email: {client.email}</p>}
                {client.phone && <p>Phone: {client.phone}</p>}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Overall Progress</span>
                <span className="text-primary font-bold">{calculateOverallProgress()}%</span>
              </div>
              <Progress value={calculateOverallProgress()} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="progress" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="progress">Progress View</TabsTrigger>
            <TabsTrigger value="gantt">Gantt Chart</TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="space-y-6 mt-6">
            {blocks.map((block) => (
              <Card key={block.id}>
                <CardHeader>
                  <CardTitle className="text-xl">{block.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {block.project_works.map((work) => (
                      <div key={work.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">{work.name}</h4>
                            {work.description && (
                              <p className="text-sm text-muted-foreground mt-1">{work.description}</p>
                            )}
                            <p className="text-sm text-muted-foreground mt-1">
                              {work.quantity} {work.unit_type}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold text-primary">
                              {work.progress || 0}%
                            </span>
                          </div>
                        </div>

                        <Progress value={work.progress || 0} className="h-2" />

                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          {work.start_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>Start: {format(new Date(work.start_date), "MMM dd, yyyy")}</span>
                            </div>
                          )}
                          {work.end_date && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>End: {format(new Date(work.end_date), "MMM dd, yyyy")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="gantt" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {!timelineRange || worksWithDates.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No timeline data available. Please add start and end dates to project works.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span>{format(timelineRange.min, "MMM dd, yyyy")}</span>
                      <span>{format(timelineRange.max, "MMM dd, yyyy")}</span>
                    </div>
                    <div className="space-y-3">
                      {worksWithDates.map((work) => {
                        const startPos = calculatePosition(work.start_date!, timelineRange);
                        const endPos = calculatePosition(work.end_date!, timelineRange);
                        const width = endPos - startPos;
                        
                        return (
                          <div key={work.id} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex-1">
                                <span className="font-medium">{work.name}</span>
                                <span className="text-muted-foreground ml-2">({work.blockName})</span>
                              </div>
                              <span className="text-primary font-semibold">{work.progress || 0}%</span>
                            </div>
                            <div className="relative h-8 bg-muted rounded-lg">
                              <div
                                className="absolute h-full bg-primary rounded-lg flex items-center px-2"
                                style={{
                                  left: `${startPos}%`,
                                  width: `${width}%`,
                                }}
                              >
                                <div className="w-full h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary-foreground/60"
                                    style={{ width: `${work.progress || 0}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{format(new Date(work.start_date!), "MMM dd")}</span>
                              <span>{format(new Date(work.end_date!), "MMM dd")}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProjectTracking;

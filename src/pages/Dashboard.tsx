import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wrench, FolderKanban, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const [stats, setStats] = useState({
    clients: 0,
    works: 0,
    projects: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [clientsRes, worksRes, projectsRes] = await Promise.all([
      supabase.from("clients").select("id", { count: "exact" }),
      supabase.from("works").select("id", { count: "exact" }),
      supabase.from("projects").select("id", { count: "exact" }),
    ]);

    setStats({
      clients: clientsRes.count || 0,
      works: worksRes.count || 0,
      projects: projectsRes.count || 0,
    });
  };

  const statCards = [
    {
      title: "Total Clients",
      value: stats.clients,
      icon: Users,
      description: "Registered clients in database",
    },
    {
      title: "Works Catalog",
      value: stats.works,
      icon: Wrench,
      description: "Available work types",
    },
    {
      title: "Active Projects",
      value: stats.projects,
      icon: FolderKanban,
      description: "Projects in system",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Welcome Back</h2>
        <p className="text-muted-foreground">
          Here's an overview of your renovation projects
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
          <CardDescription>
            Get started by managing your clients, works, and projects
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Add clients to track their renovation projects</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Build your works catalog with pricing and categories</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Create projects with custom blocks and calculations</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;

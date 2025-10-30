import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wrench, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

const Dashboard = () => {
  const [stats, setStats] = useState({
    clients: 0,
    works: 0,
  });
  const [projectsChartData, setProjectsChartData] = useState<Array<{ date: string; projects: number }>>([]);

  useEffect(() => {
    loadStats();
    loadProjectsChart();
  }, []);

  const loadStats = async () => {
    const [clientsRes, worksRes] = await Promise.all([
      supabase.from("clients").select("id", { count: "exact" }),
      supabase.from("works").select("id", { count: "exact" }),
    ]);

    setStats({
      clients: clientsRes.count || 0,
      works: worksRes.count || 0,
    });
  };

  const loadProjectsChart = async () => {
    const thirtyDaysAgo = startOfDay(subDays(new Date(), 29));
    
    const { data: projects } = await supabase
      .from("projects")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo.toISOString());

    // Create a map of dates with counts
    const dateCountMap = new Map<string, number>();
    
    // Initialize all 30 days with 0
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), "MMM dd");
      dateCountMap.set(date, 0);
    }

    // Count projects per day
    projects?.forEach((project) => {
      const dateStr = format(new Date(project.created_at), "MMM dd");
      if (dateCountMap.has(dateStr)) {
        dateCountMap.set(dateStr, (dateCountMap.get(dateStr) || 0) + 1);
      }
    });

    // Convert to array for chart
    const chartData = Array.from(dateCountMap.entries()).map(([date, projects]) => ({
      date,
      projects,
    }));

    setProjectsChartData(chartData);
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
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Welcome Back</h2>
        <p className="text-muted-foreground">
          Here's an overview of your renovation projects
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
          <CardTitle>Projects Created (Last 30 Days)</CardTitle>
          <CardDescription>
            Track your project creation activity over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={projectsChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: "hsl(var(--foreground))" }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: "hsl(var(--foreground))" }}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Line 
                type="monotone" 
                dataKey="projects" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
          <CardDescription>
            Get started by managing your clients and works catalog
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Add clients to manage their information</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Build your works catalog with pricing and categories</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;

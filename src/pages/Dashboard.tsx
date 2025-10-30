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
  const [projectsChartData, setProjectsChartData] = useState<Array<{ date: string; projects: number; total: number }>>([]);

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
      .select(`
        created_at,
        price_multiplier,
        discount,
        discount_type,
        project_rooms (
          project_room_works (
            quantity,
            is_selected,
            work_id,
            works (
              price_per_unit
            )
          )
        )
      `)
      .gte("created_at", thirtyDaysAgo.toISOString());

    // Create a map of dates with counts and totals
    const dateDataMap = new Map<string, { count: number; total: number }>();
    
    // Initialize all 30 days with 0
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), "MMM dd");
      dateDataMap.set(date, { count: 0, total: 0 });
    }

    // Calculate project totals and group by day
    projects?.forEach((project: any) => {
      const dateStr = format(new Date(project.created_at), "MMM dd");
      
      if (dateDataMap.has(dateStr)) {
        // Calculate project total
        const priceMultiplier = project.price_multiplier || 1;
        let subtotal = 0;

        project.project_rooms?.forEach((room: any) => {
          room.project_room_works?.forEach((work: any) => {
            if (work.is_selected && work.works) {
              subtotal += work.works.price_per_unit * priceMultiplier * work.quantity;
            }
          });
        });

        // Apply discount
        const discount = project.discount || 0;
        const discountAmount = project.discount_type === "percentage" 
          ? subtotal * (discount / 100)
          : discount;
        const afterDiscount = subtotal - discountAmount;

        // Add VAT
        const grandTotal = afterDiscount * 1.05;

        const currentData = dateDataMap.get(dateStr)!;
        dateDataMap.set(dateStr, {
          count: currentData.count + 1,
          total: currentData.total + grandTotal,
        });
      }
    });

    // Convert to array for chart
    const chartData = Array.from(dateDataMap.entries()).map(([date, data]) => ({
      date,
      projects: data.count,
      total: data.total,
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
                formatter={(value: any, name: string, props: any) => {
                  if (name === "projects") {
                    const total = props.payload.total;
                    return [
                      <div key="tooltip" className="space-y-1">
                        <div>{value} {value === 1 ? 'project' : 'projects'}</div>
                        <div className="text-xs text-muted-foreground">
                          Total: AED {total.toFixed(2)}
                        </div>
                      </div>,
                      ""
                    ];
                  }
                  return [value, name];
                }}
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

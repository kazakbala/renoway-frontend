import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wrench, TrendingUp, CalendarIcon } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const [stats, setStats] = useState({
    clients: 0,
    works: 0,
  });
  const [projectsChartData, setProjectsChartData] = useState<Array<{ date: string; projects: number; total: number }>>([]);
  const [dateFilter, setDateFilter] = useState<"last30" | "thisMonth" | "prevMonth" | "custom">("last30");
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});

  useEffect(() => {
    loadStats();
    loadProjectsChart();
  }, [dateFilter, customDateRange]);

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
    let startDate: Date;
    let endDate: Date = new Date();
    let dateFormat = "MMM dd";

    // Calculate date range based on filter
    switch (dateFilter) {
      case "last30":
        startDate = startOfDay(subDays(new Date(), 29));
        break;
      case "thisMonth":
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
        break;
      case "prevMonth":
        const prevMonth = subMonths(new Date(), 1);
        startDate = startOfMonth(prevMonth);
        endDate = endOfMonth(prevMonth);
        break;
      case "custom":
        if (!customDateRange.from || !customDateRange.to) return;
        startDate = startOfDay(customDateRange.from);
        endDate = startOfDay(customDateRange.to);
        // Use different format for longer ranges
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 60) {
          dateFormat = "MMM yyyy";
        }
        break;
      default:
        startDate = startOfDay(subDays(new Date(), 29));
    }
    
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
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    // Create a map of dates with counts and totals
    const dateDataMap = new Map<string, { count: number; total: number }>();
    
    // Initialize dates in range with 0
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = format(currentDate, dateFormat);
      if (!dateDataMap.has(dateKey)) {
        dateDataMap.set(dateKey, { count: 0, total: 0 });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate project totals and group by day
    projects?.forEach((project: any) => {
      const dateStr = format(new Date(project.created_at), dateFormat);
      
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Projects Created</CardTitle>
              <CardDescription>
                Track your project creation activity over time
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last30">Last 30 Days</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="prevMonth">Previous Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              
              {dateFilter === "custom" && (
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[140px] justify-start text-left font-normal",
                          !customDateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateRange.from ? format(customDateRange.from, "MMM dd") : "From"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customDateRange.from}
                        onSelect={(date) => setCustomDateRange({ ...customDateRange, from: date })}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[140px] justify-start text-left font-normal",
                          !customDateRange.to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateRange.to ? format(customDateRange.to, "MMM dd") : "To"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customDateRange.to}
                        onSelect={(date) => setCustomDateRange({ ...customDateRange, to: date })}
                        disabled={(date) => customDateRange.from ? date < customDateRange.from : false}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>
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

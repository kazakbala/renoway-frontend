import { useEffect, useState } from "react";
import api from "@/api/client";
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
  const [stats, setStats] = useState({ clients: 0, works: 0 });
  const [projectsChartData, setProjectsChartData] = useState<Array<{ date: string; projects: number; total: number }>>([]);
  const [dateFilter, setDateFilter] = useState<"last30" | "thisMonth" | "prevMonth" | "custom">("last30");
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});

  useEffect(() => {
    loadData();
  }, [dateFilter, customDateRange]);

  const loadData = async () => {
    let startDate: Date;
    let endDate: Date = new Date();
    let dateFormat = "MMM dd";

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
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 60) dateFormat = "MMM yyyy";
        break;
      default:
        startDate = startOfDay(subDays(new Date(), 29));
    }

    const { data } = await api.get("/auth/dashboard/", {
      params: {
        start_date: startDate!.toISOString(),
        end_date: endDate.toISOString(),
      },
    });

    setStats({ clients: data.clients_count, works: data.works_count });

    const dateDataMap = new Map<string, { count: number; total: number }>();
    const cur = new Date(startDate!);
    while (cur <= endDate) {
      const key = format(cur, dateFormat);
      if (!dateDataMap.has(key)) dateDataMap.set(key, { count: 0, total: 0 });
      cur.setDate(cur.getDate() + 1);
    }

    for (const p of data.projects) {
      const key = format(new Date(p.created_at), dateFormat);
      const current = dateDataMap.get(key);
      if (current) dateDataMap.set(key, { count: current.count + 1, total: current.total + p.total });
    }

    setProjectsChartData(
      Array.from(dateDataMap.entries()).map(([date, d]) => ({ date, projects: d.count, total: d.total }))
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Welcome Back</h2>
        <p className="text-muted-foreground">Here's an overview of your renovation projects</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {[
          { title: "Total Clients", value: stats.clients, icon: Users, description: "Registered clients in database" },
          { title: "Works Catalog", value: stats.works, icon: Wrench, description: "Available work types" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
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
              <CardDescription>Track your project creation activity over time</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
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
                  {(["from", "to"] as const).map((key) => (
                    <Popover key={key}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !customDateRange[key] && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customDateRange[key] ? format(customDateRange[key]!, "MMM dd") : key === "from" ? "From" : "To"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={customDateRange[key]}
                          onSelect={(date) => setCustomDateRange({ ...customDateRange, [key]: date })}
                          disabled={key === "to" && customDateRange.from ? (date) => date < customDateRange.from! : undefined}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={projectsChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--foreground))" }} />
              <YAxis className="text-xs" tick={{ fill: "hsl(var(--foreground))" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: any, name: string, props: any) => {
                  if (name === "projects") {
                    return [
                      <div key="t" className="space-y-1">
                        <div>{value} {value === 1 ? "project" : "projects"}</div>
                        <div className="text-xs text-muted-foreground">Total: AED {props.payload.total.toFixed(2)}</div>
                      </div>, ""
                    ];
                  }
                  return [value, name];
                }}
              />
              <Line type="monotone" dataKey="projects" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
          <CardDescription>Get started by managing your clients and works catalog</CardDescription>
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

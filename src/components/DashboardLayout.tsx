import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Building2, Users, Wrench, LogOut, FolderKanban, UserCog } from "lucide-react";

const navItems = [
  { path: "/dashboard", label: "Overview", icon: Building2 },
  { path: "/dashboard/clients", label: "Clients", icon: Users },
  { path: "/dashboard/works", label: "Works", icon: Wrench },
  { path: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { path: "/dashboard/team", label: "Team", icon: UserCog },
];

function AppSidebar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state } = useSidebar();
  const [tenantName, setTenantName] = useState("Renoway");

  useEffect(() => {
    const fetchTenantName = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", user.id)
        .single();

      if (profile?.tenant_id) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("name")
          .eq("id", profile.tenant_id)
          .single();

        if (tenant?.name) {
          setTenantName(tenant.name);
        }
      }
    };

    fetchTenantName();
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-4">
          <div className="p-2 bg-primary rounded-lg">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          {state !== "collapsed" && (
            <span className="font-bold text-lg">{tenantName}</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.path}
                        end
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                            isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                          )
                        }
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-2">
          {state !== "collapsed" && (
            <div className="mb-3 px-2">
              <p className="text-sm font-medium truncate">{user?.email}</p>
            </div>
          )}
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleSignOut}
            size={state === "collapsed" ? "icon" : "default"}
          >
            <LogOut className="w-4 h-4" />
            {state !== "collapsed" && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

const DashboardLayout = () => {
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-30 bg-card border-b p-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold">
                {navItems.find((item) => item.path === location.pathname)?.label || "Dashboard"}
              </h1>
            </div>
          </header>

          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;

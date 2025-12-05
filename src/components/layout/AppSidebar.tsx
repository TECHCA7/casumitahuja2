import { useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  UserCheck,
  FileText,
  Calculator,
  Receipt,
  FileSpreadsheet,
  FileType,
  ScanText,
  MessageSquareReply,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserRole } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/mode-toggle";

interface MenuItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  roles: ("admin" | "staff" | "client")[];
}

const allMenuItems: MenuItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard", roles: ["admin", "staff"] },
  { title: "Office Tasks", icon: ClipboardList, path: "/office-tasks", roles: ["admin", "staff"] },
  { title: "Attendance", icon: UserCheck, path: "/attendance", roles: ["admin", "staff"] },
  { title: "Client Documents", icon: FileText, path: "/documents", roles: ["admin", "staff", "client"] },
  { title: "Tax Calculator", icon: Calculator, path: "/tax-calculator", roles: ["admin", "staff", "client"] },
  { title: "Billing & Invoicing", icon: Receipt, path: "/billing", roles: ["admin", "staff"] },
  { title: "Project Report / CMA", icon: FileSpreadsheet, path: "/project-report", roles: ["admin", "staff"] },
  { title: "PDF Tools", icon: FileType, path: "/pdf-tools", roles: ["admin", "staff", "client"] },
  { title: "Document OCR", icon: ScanText, path: "/ocr", roles: ["admin", "staff", "client"] },
  { title: "Notice Reply", icon: MessageSquareReply, path: "/notice-reply", roles: ["admin", "staff"] },
];

function SidebarContent({ collapsed = false, onNavClick }: { collapsed?: boolean; onNavClick?: () => void }) {
  const { toast } = useToast();
  const { role, isAdmin, isStaff, isClient } = useUserRole();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  // Filter menu items based on role
  const menuItems = allMenuItems.filter((item) => {
    if (isAdmin) return item.roles.includes("admin");
    if (isStaff) return item.roles.includes("staff");
    if (isClient) return item.roles.includes("client");
    return false;
  });

  const getRoleBadge = () => {
    if (isAdmin) return <Badge className="bg-red-500/20 text-red-500 text-[10px]">Admin</Badge>;
    if (isStaff) return <Badge className="bg-blue-500/20 text-blue-500 text-[10px]">Staff</Badge>;
    if (isClient) return <Badge className="bg-green-500/20 text-green-500 text-[10px]">Client</Badge>;
    return null;
  };

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-lg">SA</span>
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="font-semibold text-sm leading-tight">Sumit Ahuja & Associates</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-sidebar-foreground/60">Office App</p>
                {getRoleBadge()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={onNavClick}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/80",
                    collapsed && "justify-center px-2"
                  )
                }
                title={collapsed ? item.title : undefined}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium animate-fade-in">{item.title}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        {/* Theme Toggle */}
        <div className={cn("flex items-center justify-center", !collapsed && "justify-start px-3 py-2")}>
           <ModeToggle />
           {!collapsed && <span className="ml-3 text-sm font-medium">Theme</span>}
        </div>

        {/* Settings - only for admin */}
        {isAdmin && (
          <NavLink
            to="/settings"
            onClick={onNavClick}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80",
                collapsed && "justify-center px-2"
              )
            }
          >
            <Settings className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Settings</span>}
          </NavLink>
        )}

        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
            "hover:bg-destructive/10 text-sidebar-foreground/80 hover:text-destructive",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
        </button>
        
        {/* Developer credit */}
        {!collapsed && (
          <div className="pt-2 mt-2 border-t border-sidebar-border/50">
            <p className="text-[10px] text-sidebar-foreground/40 text-center">
              Developed by CA Sumit Ahuja
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  // Mobile: use Sheet drawer
  if (isMobile) {
    return (
      <>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm shadow-md"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-sidebar text-sidebar-foreground">
            <div className="h-full flex flex-col">
              <SidebarContent onNavClick={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: standard sidebar
  return (
    <aside
      className={cn(
        "h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 sticky top-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarContent collapsed={collapsed} />
      
      {/* Collapse button - desktop only */}
      <div className="p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed && "px-2"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

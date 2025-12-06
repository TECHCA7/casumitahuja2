import { Outlet, Navigate, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppLayout() {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, isClient } = useUserRole();
  const isMobile = useIsMobile();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    console.log("AppLayout: No user found, redirecting to /auth");
    // If we are trying to access a client route, maybe we should go to client portal?
    // But we don't know if the user INTENDED to be a client.
    return <Navigate to="/auth" replace />;
  }

  // Restrict client access to certain pages
  const clientAllowedPaths = ["/documents", "/tax-calculator", "/pdf-tools", "/ocr"];
  if (isClient && !clientAllowedPaths.includes(location.pathname)) {
    console.log("AppLayout: Client restricted from", location.pathname, "redirecting to /documents");
    return <Navigate to="/documents" replace />;
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <div className={isMobile ? "p-4 pt-16" : "p-6 lg:p-8"}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

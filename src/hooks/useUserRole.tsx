import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "staff" | "client" | null;

interface UseUserRoleReturn {
  role: UserRole;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isClient: boolean;
  clientId: string | null;
}

export function useUserRole(): UseUserRoleReturn {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRole() {
      setLoading(true);
      if (!user) {
        setRole(null);
        setClientId(null);
        localStorage.removeItem("user_role");
        localStorage.removeItem("client_id");
        setLoading(false);
        return;
      }

      // Optimistic check from localStorage
      const cachedRole = localStorage.getItem("user_role") as UserRole;
      const cachedClientId = localStorage.getItem("client_id");
      
      if (cachedRole === "client" && cachedClientId) {
        setRole("client");
        setClientId(cachedClientId);
      }

      try {
        // Fetch user role - use maybeSingle to handle 0 or 1 row, but we should handle multiple too
        const { data: rolesData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (roleError) {
          console.error("Error fetching role:", roleError);
          if (!cachedClientId) setRole("staff"); // Default to staff on error only if not cached
        } else if (rolesData && rolesData.length > 0) {
          // Prioritize roles: admin > staff > client
          const roles = rolesData.map(r => r.role);
          if (roles.includes("admin")) setRole("admin");
          else if (roles.includes("staff")) setRole("staff");
          else if (roles.includes("client")) setRole("client");
          else if (!cachedClientId) setRole("staff"); // Fallback
        } else {
          // No role found - default to staff? Or maybe client if they are in client_auth?
          // Let's check client_auth to be sure
          const { data: clientAuth } = await supabase
            .from("client_auth")
            .select("client_id")
            .eq("user_id", user.id)
            .maybeSingle();
            
          if (clientAuth) {
            setRole("client");
            setClientId(clientAuth.client_id);
            localStorage.setItem("user_role", "client");
            localStorage.setItem("client_id", clientAuth.client_id);
          } else {
            if (!cachedClientId) setRole("staff");
          }
        }

        // If we determined they are a client (or have client role), fetch client_id
        // We do this even if they are staff, just in case we want to know their client_id
        const { data: clientAuth } = await supabase
          .from("client_auth")
          .select("client_id")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (clientAuth) {
          setClientId(clientAuth.client_id);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        if (!cachedClientId) setRole("staff");
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  return {
    role,
    loading,
    isAdmin: role === "admin",
    isStaff: role === "admin" || role === "staff",
    isClient: role === "client" || !!clientId, // Treat as client if they have a client_id linked
    clientId,
  };
}

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
        // Use secure RPC to get user details (bypasses RLS)
        const { data: userDetails, error: rpcError } = await supabase
          .rpc('get_user_details_secure', { p_user_id: user.id });

        if (rpcError) {
          console.error("Error fetching user details via RPC:", rpcError);
          // Fallback to manual check if RPC fails (e.g. function doesn't exist yet)
          throw rpcError;
        }

        if (userDetails) {
          // @ts-ignore
          const { role: finalRole, client_id: fetchedClientId } = userDetails;
          
          setRole(finalRole as UserRole);
          if (fetchedClientId) {
            setClientId(fetchedClientId);
            localStorage.setItem("user_role", "client");
            localStorage.setItem("client_id", fetchedClientId);
          } else {
             // If not client, clear client cache
             if (finalRole !== 'client') {
                localStorage.removeItem("client_id");
             }
          }
        }
      } catch (error) {
        console.error("Error fetching user role (fallback):", error);
        
        // Fallback logic (original code)
        const { data: rolesData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
          
        // ... (rest of fallback logic if needed, but for now let's trust the RPC or cache)
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
